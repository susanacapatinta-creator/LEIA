import {
  ComprehensionLevel,
  EducationLevel,
  ExamData,
  ExamQuestion,
  LiteraryAnalysisData,
  CharacterProfile,
  VocabularyWord,
  UserRole,
} from '../types';
import { extractBookSectionSlice, sampleBookAcrossSections } from './textChunker';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  educationLevel: EducationLevel;
  createdAt: string;
}

export interface HealthStatus {
  status: string;
  hasApiKey: boolean;
  model: string;
  appUrl?: string;
  requiresAccountForAi?: boolean;
  openRegistration?: boolean;
  capabilities: {
    socraticChat: boolean;
    examGeneration: boolean;
    vocabularyAnalysis: boolean;
    literaryAnalysis: boolean;
    characterDossier: boolean;
    browserTTS: boolean;
    geminiTTS: boolean;
  };
}

// Keep auth token strictly in memory (never in localStorage or sessionStorage)
let currentAuthToken: string | null = null;
let authRequiredListener: ((message?: string) => void) | null = null;

export function setAuthToken(token: string | null) {
  currentAuthToken = token;
}

export function getAuthToken(): string | null {
  return currentAuthToken;
}

export function registerAuthRequiredHandler(handler: ((message?: string) => void) | null) {
  authRequiredListener = handler;
}

function buildAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (currentAuthToken) {
    headers.Authorization = `Bearer ${currentAuthToken}`;
  }
  return headers;
}

async function parseJsonOrThrow(response: Response, fallbackError: string) {
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    const msg =
      data?.error ||
      'Debes crear una cuenta o iniciar sesión en LEIA para usar las funciones de IA.';
    if (authRequiredListener) {
      authRequiredListener(msg);
    }
    throw new Error(msg);
  }
  if (!response.ok) {
    throw new Error(data?.error || fallbackError);
  }
  return data;
}

export async function registerAccount(params: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  educationLevel: EducationLevel;
}): Promise<{ token: string; user: AuthUser }> {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'No se pudo crear la cuenta.');
  }
  return data;
}

export async function loginAccount(params: {
  email: string;
  password: string;
}): Promise<{ token: string; user: AuthUser }> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Correo o contraseña incorrectos.');
  }
  return data;
}

export async function logoutAccount(): Promise<void> {
  if (!currentAuthToken) return;
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: buildAuthHeaders(),
    });
  } catch {
    // Ignore network failures on logout
  }
}

export async function checkServerHealth(): Promise<HealthStatus> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.warn('Servidor API local no respondió directamente:', error);
    return {
      status: 'offline',
      hasApiKey: false,
      model: 'gemini-3.8-flash',
      requiresAccountForAi: true,
      openRegistration: true,
      capabilities: {
        socraticChat: true,
        examGeneration: true,
        vocabularyAnalysis: true,
        literaryAnalysis: true,
        characterDossier: true,
        browserTTS: true,
        geminiTTS: false,
      },
    };
  }
}

export async function sendSocraticChatMessage(params: {
  documentTitle: string;
  documentExcerpt: string;
  level: ComprehensionLevel;
  chatHistory: { role: string; text: string }[];
  userMessage: string;
  studentProfile: EducationLevel;
}): Promise<{ reply: string; level: ComprehensionLevel; timestamp: string }> {
  const response = await fetch('/api/socratic-chat', {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: JSON.stringify(params),
  });

  return parseJsonOrThrow(response, 'Error al comunicarse con la tutora LEIA.');
}

export interface ExamGenerationProgress {
  generatedCount: number;
  totalRequested: number;
  currentBatch: number;
  totalBatches: number;
  sectionLabel: string;
}

export async function requestExamGeneration(params: {
  documentTitle: string;
  documentText: string;
  questionsCount: number;
  level?: string;
  onProgress?: (p: ExamGenerationProgress) => void;
  signal?: AbortSignal;
}): Promise<ExamData> {
  const totalRequested = Math.min(Math.max(Number(params.questionsCount) || 5, 1), 80);
  const batchSize = totalRequested <= 10 ? totalRequested : 10;
  const totalBatches = Math.ceil(totalRequested / batchSize);

  const allQuestions: ExamQuestion[] = [];
  const avoidTopics: string[] = [];
  let examTitle = `Evaluación Formativa: ${params.documentTitle}`;
  let examInstructions =
    'Lee con atención cada enunciado, analiza las pistas del texto y fundamenta tus respuestas.';

  for (let b = 0; b < totalBatches; b++) {
    if (params.signal?.aborted) {
      throw new Error('Generación cancelada por el usuario.');
    }

    const remaining = totalRequested - allQuestions.length;
    const countThisBatch = Math.min(batchSize, remaining);
    const { excerpt, rangeLabel } = extractBookSectionSlice(
      params.documentText,
      b,
      totalBatches,
      16000
    );

    if (params.onProgress) {
      params.onProgress({
        generatedCount: allQuestions.length,
        totalRequested,
        currentBatch: b + 1,
        totalBatches,
        sectionLabel: rangeLabel,
      });
    }

    const response = await fetch('/api/generate-exam', {
      method: 'POST',
      headers: buildAuthHeaders(),
      signal: params.signal,
      body: JSON.stringify({
        documentTitle: params.documentTitle,
        documentText: excerpt,
        questionsCount: countThisBatch,
        level: params.level || 'mixto',
        sectionLabel: rangeLabel,
        avoidTopics: avoidTopics.slice(-25),
        startId: allQuestions.length + 1,
      }),
    });

    const data = await parseJsonOrThrow(response, 'No se pudo generar la evaluación formativa.');

    if (b === 0 && data.title) {
      examTitle = totalRequested > 15 ? `${data.title} (${totalRequested} preguntas)` : data.title;
    }
    if (b === 0 && data.instructions) {
      examInstructions = data.instructions;
    }

    const batchQuestions: ExamQuestion[] = (data.questions || []).map((q: any, idx: number) => {
      const normalizedLevel: ComprehensionLevel =
        q.level === 'literal' || q.level === 'inferential' || q.level === 'critical'
          ? q.level
          : q.level === 'inferencial'
          ? 'inferential'
          : q.level === 'critico' || q.level === 'crítico'
          ? 'critical'
          : 'inferential';

      if (q.prompt) {
        avoidTopics.push(String(q.prompt).slice(0, 90));
      }

      return {
        ...q,
        level: normalizedLevel,
        id: allQuestions.length + idx + 1,
        selectedOptionIndex: undefined,
        openAnswer: '',
        isCorrect: undefined,
        revealedHint: false,
      };
    });

    allQuestions.push(...batchQuestions);
  }

  if (params.onProgress) {
    params.onProgress({
      generatedCount: allQuestions.length,
      totalRequested,
      currentBatch: totalBatches,
      totalBatches,
      sectionLabel: 'Completado',
    });
  }

  return {
    id: `exam-${Date.now()}`,
    documentId: '',
    documentTitle: params.documentTitle,
    title: examTitle,
    createdAt: new Date().toISOString(),
    instructions: examInstructions,
    completed: false,
    questions: allQuestions.slice(0, totalRequested),
  };
}

export async function requestVocabularyDeduction(params: {
  word: string;
  sentenceContext: string;
  studentDeduction: string;
  documentTitle: string;
}): Promise<Omit<VocabularyWord, 'id' | 'documentId' | 'mastered' | 'dateAdded'>> {
  const response = await fetch('/api/vocabulary-deduce', {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: JSON.stringify(params),
  });

  return parseJsonOrThrow(response, 'No se pudo analizar el vocabulario.');
}

export async function requestLiteraryAnalysis(params: {
  documentTitle: string;
  documentText: string;
}): Promise<LiteraryAnalysisData> {
  const sampledText = sampleBookAcrossSections(params.documentText, 22000);
  const response = await fetch('/api/literary-analysis', {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: JSON.stringify({
      documentTitle: params.documentTitle,
      documentText: sampledText,
    }),
  });

  const data = await parseJsonOrThrow(response, 'No se pudo completar el análisis literario.');
  return {
    ...data,
    documentId: '',
    lastUpdated: new Date().toISOString(),
  };
}

export async function requestCharacterAnalysis(params: {
  documentTitle: string;
  documentText: string;
  characterName?: string;
}): Promise<{ characters: CharacterProfile[] }> {
  const sampledText = sampleBookAcrossSections(params.documentText, 22000);
  const response = await fetch('/api/character-analysis', {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: JSON.stringify({
      documentTitle: params.documentTitle,
      documentText: sampledText,
      characterName: params.characterName,
    }),
  });

  const data = await parseJsonOrThrow(response, 'No se pudieron extraer las fichas de personajes.');
  return {
    characters: (data.characters || []).map((char: any, idx: number) => ({
      ...char,
      id: `char-${Date.now()}-${idx}`,
      documentId: '',
    })),
  };
}

export async function requestNeuralTTS(params: {
  text: string;
  voiceName?: 'Kore' | 'Zephyr' | 'Puck' | 'Fenrir' | 'Charon';
  style?: string;
}): Promise<{ audio: string; voiceName: string }> {
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: JSON.stringify(params),
  });

  return parseJsonOrThrow(response, 'No se pudo generar la voz neural.');
}
