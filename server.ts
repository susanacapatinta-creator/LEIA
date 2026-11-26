import express, { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  registerUser,
  loginUser,
  deleteSessionByHash,
  requireAuth,
  AuthError,
  AuthenticatedRequest,
} from './server/auth';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '30mb' }));

// Helper to get GoogleGenAI client
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 1. Health check & configuration status
app.get('/api/health', (req: Request, res: Response) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: 'ok',
    hasApiKey: hasKey,
    model: 'gemini-3.8-flash',
    version: '1.0.0',
    appUrl: process.env.APP_URL || '',
    requiresAccountForAi: true,
    openRegistration: true,
    capabilities: {
      socraticChat: true,
      examGeneration: true,
      vocabularyAnalysis: true,
      literaryAnalysis: true,
      characterDossier: true,
      browserTTS: true,
      geminiTTS: hasKey,
    },
  });
});

// 1b. Auth routes (Open registration for all students & teachers without needing a Gemini account)
app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { name, email, password, role, educationLevel } = req.body || {};
    const result = registerUser({ name, email, password, role, educationLevel });
    res.status(201).json(result);
  } catch (err: any) {
    if (err instanceof AuthError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    console.error('Error en /api/auth/register:', err);
    res.status(500).json({ error: 'No se pudo completar el registro de cuenta.' });
  }
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};
    const result = loginUser({ email, password });
    res.json(result);
  } catch (err: any) {
    if (err instanceof AuthError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    console.error('Error en /api/auth/login:', err);
    res.status(500).json({ error: 'No se pudo iniciar sesión.' });
  }
});

app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

app.post('/api/auth/logout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (req.sessionTokenHash) {
    deleteSessionByHash(req.sessionTokenHash);
  }
  res.json({ ok: true });
});

// Helper to safely parse JSON that may be wrapped in markdown code fences
function safeParseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      const startObj = cleaned.indexOf('{');
      const endObj = cleaned.lastIndexOf('}');
      if (startObj !== -1 && endObj > startObj) {
        return JSON.parse(cleaned.slice(startObj, endObj + 1)) as T;
      }
      return fallback;
    }
  }
}

// Resilient generator with immediate fallback order to prevent 503 / high demand hangs
async function generateWithFallback(ai: GoogleGenAI, options: { contents: any; config?: any }) {
  // Use gemini-3.1-flash-lite as primary fast model to bypass temporary 503 spikes on 3.8-flash
  const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const resp = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: options.config,
      });
      return resp;
    } catch (err: any) {
      lastError = err;
      console.warn(`[LEIA] Modelo ${model} no disponible (${err?.status || err?.message?.slice(0, 40)}). Cambiando a modelo alternativo...`);
    }
  }
  throw lastError;
}

// Socratic System prompt rules
const SOCRATIC_INSTRUCTIONS = `
Eres LEIA (Lectora Educativa Inteligente Asistida), una tutora socrática, paciente, rigurosa y motivadora, especializada en comprensión lectora para estudiantes de secundaria y educación superior.

REGLAS PEDAGÓGICAS ESTRICTAS:
1. Actúa como tutora socrática: NO entregues resúmenes listos para copiar ni soluciones directas a preguntas o tareas.
2. Orienta mediante preguntas reflexivas y UNA SOLA pista progresiva a la vez. Si el estudiante se equivoca o duda, proporciona un andamiaje gradual, nunca la respuesta completa.
3. Exige siempre evidencia textual: pide al estudiante que cite palabras clave, frases o párrafos del documento para justificar su interpretación.
4. NUNCA inventes citas, páginas, personajes ni acontecimientos que no figuren en el documento proporcionado.
5. Si el documento no contiene información suficiente para responder, indícalo explícitamente: "El texto seleccionado no contiene detalles sobre eso...".
6. Adapta tu lenguaje al nivel del estudiante (secundaria / educación superior), manteniendo tono respetuoso, pedagógico y en perfecto español.
7. Respeta el nivel de comprensión seleccionado por el estudiante:
   - Nivel Literal: Ayuda a localizar datos explícitos (quién, qué, cuándo, dónde) guiándolo hacia la sección relevante sin recitar la respuesta.
   - Nivel Inferencial: Ayuda a deducir causas, motivos ocultos, significados connotativos y relaciones implícitas a través de pistas.
   - Nivel Crítico: Formula contrapreguntas, cuestiona supuestos, pide juicios de valor fundamentados y análisis ético/social de las decisiones y temas.
`;

// 2. Chat Socrático para Lectura Guiada
app.post('/api/socratic-chat', requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      documentTitle,
      documentExcerpt,
      level = 'inferential', // 'literal' | 'inferential' | 'critical'
      chatHistory = [],
      userMessage,
      studentProfile = 'secundaria', // 'secundaria' | 'superior'
    } = req.body;

    if (!userMessage?.trim()) {
      res.status(400).json({ error: 'El mensaje del estudiante es requerido.' });
      return;
    }

    const ai = getGenAI();
    if (!ai) {
      res.status(503).json({
        error: 'El servicio de IA no está configurado (falta GEMINI_API_KEY en el servidor).',
        fallbackAvailable: true,
      });
      return;
    }

    const contextSnippet = documentExcerpt
      ? `\n--- CONTENIDO DEL TEXTO EN ESTUDIO ("${documentTitle || 'Documento sin título'}") ---\n${documentExcerpt.slice(0, 26000)}\n--- FIN DEL TEXTO ---`
      : '\n[Nota: No se ha cargado ningún texto específico todavía. Invita al estudiante a subir o elegir un texto de la biblioteca].';

    const historyFormatted = Array.isArray(chatHistory)
      ? chatHistory
          .slice(-6)
          .map((m: { role: string; text: string }) => `${m.role === 'user' ? 'Estudiante' : 'LEIA'}: ${m.text}`)
          .join('\n')
      : '';

    const prompt = `
${SOCRATIC_INSTRUCTIONS}

DATOS DE LA SESIÓN:
- Nivel de comprensión objetivo: ${level.toUpperCase()}
- Perfil del estudiante: ${studentProfile}
- Documento activo: "${documentTitle || 'Sin título'}"
${contextSnippet}

HISTORIAL RECIENTE:
${historyFormatted || '(Inicio de conversación)'}

NUEVO MENSAJE DEL ESTUDIANTE:
"${userMessage}"

INSTRUCCIONES PARA TU RESPUESTA:
- Responde directamente al estudiante manteniendo el rol de LEIA.
- Analiza qué intentó decir el estudiante.
- Si hizo una pregunta sobre el texto, devuélvele una pregunta orientadora o dale una pista inicial sobre dónde mirar en el texto.
- Si propuso una hipótesis, pídele que la respalde citando una frase del texto.
- Si el nivel es "crítico", añade una contrapregunta que explore las implicancias éticas o sociales.
- Mantén la respuesta concisa (máximo 2 a 3 párrafos breves) para favorecer el diálogo interactivo.
`;

    const response = await generateWithFallback(ai, {
      contents: prompt,
    });

    const reply = response.text || 'LEIA está analizando el texto. ¿Podrías reformular tu consulta o indicarme qué párrafo te genera dudas?';

    res.json({
      reply,
      level,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error en /api/socratic-chat:', error);
    res.status(500).json({
      error: 'Hubo un error al procesar la respuesta con el tutor socrático.',
      details: error?.message || 'Error desconocido',
    });
  }
});

// 3. Generador de Examen y Evaluaciones Formativas (Soporta lotes para exámenes extensos de hasta 80 preguntas)
app.post('/api/generate-exam', requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      documentTitle,
      documentText,
      questionsCount = 5,
      level = 'mixto',
      sectionLabel = 'Obra completa',
      avoidTopics = [],
      startId = 1,
    } = req.body;

    if (!documentText || documentText.trim().length < 50) {
      res.status(400).json({ error: 'El texto del documento debe tener al menos 50 caracteres para generar una evaluación formativa.' });
      return;
    }

    const ai = getGenAI();
    if (!ai) {
      res.status(503).json({
        error: 'El servicio de IA no está configurado (falta GEMINI_API_KEY).',
      });
      return;
    }

    const safeCount = Math.min(Math.max(Number(questionsCount) || 5, 1), 15);
    const levelInstruction =
      level === 'literal'
        ? 'Prioriza preguntas de nivel LITERAL (datos explícitos, personajes, fechas, hechos concretos).'
        : level === 'inferencial'
        ? 'Prioriza preguntas de nivel INFERENCIAL (causas implícitas, intenciones, deducciones entre líneas).'
        : level === 'critico'
        ? 'Prioriza preguntas de nivel CRÍTICO (dilemas éticos, posturas fundamentadas, valoración argumentada).'
        : 'Equilibra preguntas de nivel LITERAL, INFERENCIAL y CRÍTICO.';

    const avoidBlock =
      Array.isArray(avoidTopics) && avoidTopics.length > 0
        ? `\nEVITA REPETIR PREGUNTAS O TEMAS YA EVALUADOS EN LOTES ANTERIORES:\n- ${avoidTopics.slice(-25).join('\n- ')}\n`
        : '';

    const prompt = `
Eres LEIA, especialista en evaluación formativa y comprensión lectora.
Analiza con rigor el siguiente fragmento o sección del libro:
TITULO: "${documentTitle || 'Texto de lectura'}"
SECCIÓN ACTUAL: "${sectionLabel}"
ENFOQUE SOLICITADO: ${levelInstruction}
${avoidBlock}
TEXTO:
"""
${documentText.slice(0, 18000)}
"""

Genera una evaluación diagnóstica/formativa con exactamente ${safeCount} preguntas pedagógicas únicas, variadas y bien fundamentadas en formato JSON:
1. Preguntas de Selección Múltiple ("multiple_choice"), cada una con 4 opciones claras, una respuesta correcta (índice 0 a 3), y una "socraticHint" para guiar al estudiante si falla.
2. Preguntas de Desarrollo o Inferencia ("open_development") donde el estudiante deba deducir o argumentar con citas del texto y se provea "rubricCriteria".
3. Numera los IDs de las preguntas empezando desde ${Number(startId) || 1}.

Devuelve estrictamente un objeto JSON con este esquema exacto:
{
  "title": "Título sugerido para el examen",
  "document": "${documentTitle || 'Texto'}",
  "instructions": "Instrucciones claras para el estudiante",
  "questions": [
    {
      "id": ${Number(startId) || 1},
      "type": "multiple_choice",
      "level": "literal",
      "prompt": "Enunciado de la pregunta...",
      "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "correctOptionIndex": 0,
      "socraticHint": "Pista orientadora para quien necesite ayuda...",
      "textualEvidenceLocation": "Cita breve o indicación de página/sección donde se sustenta",
      "rubricCriteria": "Criterio de evaluación si es de desarrollo"
    }
  ]
}
`;

    const response = await generateWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const raw = response.text || '{}';
    const parsedData = safeParseJson(raw, {
      title: `Evaluación Formativa: ${documentTitle || 'Texto'}`,
      document: documentTitle || 'Texto',
      instructions: 'Lee con atención y fundamenta tus respuestas.',
      questions: [],
    });

    res.json(parsedData);
  } catch (error: any) {
    console.error('Error en /api/generate-exam:', error);
    res.status(500).json({
      error: 'Error al generar el examen.',
      details: error?.message,
    });
  }
});

// 4. Módulo de Vocabulario Contextual Socrático
app.post('/api/vocabulary-deduce', requireAuth, async (req: Request, res: Response) => {
  try {
    const { word, sentenceContext, studentDeduction, documentTitle } = req.body;

    if (!word?.trim()) {
      res.status(400).json({ error: 'La palabra a analizar es obligatoria.' });
      return;
    }

    const ai = getGenAI();
    if (!ai) {
      res.status(503).json({ error: 'Falta GEMINI_API_KEY en el servidor.' });
      return;
    }

    const prompt = `
Eres LEIA, tutora socrática de comprensión lectora.
Analiza la palabra "${word}" en el contexto de la obra "${documentTitle || 'lectura'}".

ORACIÓN/CONTEXTO ORIGINAL:
"${sentenceContext || 'No especificado'}"

DEDUCCIÓN DEL ESTUDIANTE:
"${studentDeduction || 'El estudiante aún no ha propuesto una hipótesis y pide ayuda para deducirla.'}"

INSTRUCCIONES:
Devuelve un JSON estricto con:
{
  "word": "${word}",
  "studentEvaluation": "Evaluación formativa de la deducción del estudiante: reconoce si va por buen camino, qué pistas morfológicas o de contexto aprovechó y qué matiz le faltó considerar.",
  "contextualMeaning": "Significado preciso en el contexto específico de esta obra (no una definición genérica de diccionario, sino qué significa en esta situación).",
  "etymologyOrMorphemes": "Etimología o despiece de raíces/prefijos que ayudan a recordar su sentido.",
  "socraticReflectionQuestion": "Una pregunta para que el estudiante use esta palabra en una oración propia vinculada a su vida o a otro libro.",
  "synonymsInContext": ["sinónimo 1", "sinónimo 2"]
}
`;

    const response = await generateWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = safeParseJson(response.text?.trim(), {});
    res.json(parsed);
  } catch (error: any) {
    console.error('Error en /api/vocabulary-deduce:', error);
    res.status(500).json({ error: 'Error al analizar el vocabulario.', details: error?.message });
  }
});

// 5. Módulo de Análisis Literario Guiado
app.post('/api/literary-analysis', requireAuth, async (req: Request, res: Response) => {
  try {
    const { documentTitle, documentText } = req.body;

    if (!documentText || documentText.length < 50) {
      res.status(400).json({ error: 'Texto insuficiente para análisis literario.' });
      return;
    }

    const ai = getGenAI();
    if (!ai) {
      res.status(503).json({ error: 'Falta GEMINI_API_KEY en el servidor.' });
      return;
    }

    const prompt = `
Eres LEIA. Realiza una guía de análisis literario pedagógico sobre el texto:
TITULO: "${documentTitle || 'Texto literario'}"
FRAGMENTO:
"""
${documentText.slice(0, 24000)}
"""

Genera un JSON estructurado con los pilares del análisis literario, incluyendo preguntas socráticas para invitar al estudiante a investigar y reflexionar:
{
  "genre": "Género y subgénero (narrativo, lírico, dramático, ensayístico)",
  "literaryMovement": "Movimiento o corriente literaria probable (ej: Realismo, Modernismo, Boom, etc.)",
  "historicalContext": "Contexto histórico, cultural o sociopolítico en el que surge la obra",
  "mainThemes": ["Tema central 1", "Tema central 2", "Tema secundario"],
  "expressiveResources": [
    {
      "figure": "Nombre de la figura retórica o recurso de estilo (metáfora, hipérbole, ironía, prosopopeya...)",
      "exampleQuote": "Cita textual del fragmento que lo ejemplifica",
      "effect": "Efecto estético o significado que aporta al lector"
    }
  ],
  "socraticChallenges": [
    "Pregunta de debate 1 para pensar...",
    "Pregunta de debate 2 para debatir en clase..."
  ]
}
`;

    const response = await generateWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = safeParseJson(response.text?.trim(), {});
    res.json(parsed);
  } catch (error: any) {
    console.error('Error en /api/literary-analysis:', error);
    res.status(500).json({ error: 'Error al generar análisis literario.', details: error?.message });
  }
});

// 6. Módulo de Fichas de Personajes
app.post('/api/character-analysis', requireAuth, async (req: Request, res: Response) => {
  try {
    const { documentTitle, documentText, characterName } = req.body;

    if (!documentText || documentText.length < 50) {
      res.status(400).json({ error: 'Texto insuficiente para ficha de personajes.' });
      return;
    }

    const ai = getGenAI();
    if (!ai) {
      res.status(503).json({ error: 'Falta GEMINI_API_KEY en el servidor.' });
      return;
    }

    const prompt = `
Eres LEIA. Analiza los personajes en el texto "${documentTitle || 'Obra'}" ${characterName ? `centrándote en ${characterName}` : ''}:
TEXTO:
"""
${documentText.slice(0, 24000)}
"""

Genera un JSON con una lista de personajes identificados con sus dimensiones literarias y psicológicas:
{
  "characters": [
    {
      "name": "Nombre del personaje",
      "role": "Protagonista / Antagonista / Secundario / Testigo",
      "physicalAndPsychologicalTraits": "Rasgos físicos, emocionales y de personalidad evidenciados en el texto",
      "motivations": "Objetivos y motivaciones internas",
      "conflicts": "Conflictos internos o externos que enfrenta",
      "relationships": "Vínculos clave con otros personajes",
      "arcEvolution": "Evolución a lo largo del fragmento/obra",
      "keyQuote": "Cita textual representativa de su carácter",
      "socraticDilemma": "Dilema moral o decisión del personaje para que el estudiante juzgue críticamente"
    }
  ]
}
`;

    const response = await generateWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = safeParseJson(response.text?.trim(), { characters: [] });
    res.json(parsed);
  } catch (error: any) {
    console.error('Error en /api/character-analysis:', error);
    res.status(500).json({ error: 'Error al analizar personajes.', details: error?.message });
  }
});

// 7. Módulo de Lectura en Voz Alta con Voz Neural Suave y Tranquila (Gemini TTS)
app.post('/api/tts', requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      text,
      voiceName = 'Kore', // 'Kore' (cálida/tranquila), 'Zephyr' (suave/pausada), 'Puck', 'Fenrir'
      style = 'Voz muy tranquila, suave, dulce, natural, pausada y relajante para lectura educativa en español',
    } = req.body;

    if (!text?.trim()) {
      res.status(400).json({ error: 'Texto requerido para la síntesis de voz.' });
      return;
    }

    const ai = getGenAI();
    if (!ai) {
      res.status(503).json({ error: 'Falta GEMINI_API_KEY en el servidor.' });
      return;
    }

    // Limit chunk to avoid overflow
    const safeText = text.trim().slice(0, 1500);

    const ttsResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: safeText,
              speechMetadata: {
                style: style || 'Voz tranquila, pausada, serena, cálida y suave en español.',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' },
          },
        },
      },
    });

    const base64Audio =
      ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      res.status(500).json({ error: 'No se generó el audio de la voz neural.' });
      return;
    }

    res.json({
      audio: `data:audio/wav;base64,${base64Audio}`,
      voiceName,
    });
  } catch (error: any) {
    console.error('Error en /api/tts:', error);
    res.status(500).json({
      error: 'Error al generar la voz neural.',
      details: error?.message,
    });
  }
});

// Vite or Static Serving
async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV === 'production') {
    const distDir = fs.existsSync(path.resolve(__dirname, 'index.html'))
      ? __dirname
      : path.resolve(process.cwd(), 'dist');

    app.use(express.static(distDir));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const hmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: !hmrDisabled,
        ws: hmrDisabled ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[LEIA Server] Servidor activo en http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[LEIA Server] Error fatal al iniciar:', err);
});
