export type ComprehensionLevel = 'literal' | 'inferential' | 'critical';

export type UserRole = 'estudiante' | 'docente';
export type EducationLevel = 'secundaria' | 'superior';

export interface DocumentItem {
  id: string;
  title: string;
  author?: string;
  genre?: string;
  pageCount?: number;
  wordCount: number;
  content: string;
  dateAdded: string;
  sourceType: 'pdf' | 'sample' | 'text';
  summary?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  level?: ComprehensionLevel;
  quotedText?: string;
  isHint?: boolean;
}

export interface ExamQuestion {
  id: number;
  type: 'multiple_choice' | 'open_development';
  level: ComprehensionLevel;
  prompt: string;
  options?: string[];
  correctOptionIndex?: number;
  socraticHint?: string;
  textualEvidenceLocation?: string;
  rubricCriteria?: string;
  // Student answer state
  selectedOptionIndex?: number;
  openAnswer?: string;
  isCorrect?: boolean;
  teacherFeedback?: string;
  revealedHint?: boolean;
}

export interface ExamData {
  id: string;
  documentId: string;
  documentTitle: string;
  title: string;
  createdAt: string;
  instructions: string;
  questions: ExamQuestion[];
  completed?: boolean;
  score?: number; // 0-100
}

export interface VocabularyWord {
  id: string;
  documentId: string;
  word: string;
  sentenceContext: string;
  studentDeduction: string;
  studentEvaluation?: string;
  contextualMeaning: string;
  etymologyOrMorphemes: string;
  socraticReflectionQuestion: string;
  synonymsInContext: string[];
  mastered: boolean;
  dateAdded: string;
}

export interface ExpressiveResource {
  figure: string;
  exampleQuote: string;
  effect: string;
}

export interface LiteraryAnalysisData {
  documentId: string;
  genre: string;
  literaryMovement: string;
  historicalContext: string;
  mainThemes: string[];
  expressiveResources: ExpressiveResource[];
  socraticChallenges: string[];
  lastUpdated: string;
}

export interface CharacterProfile {
  id: string;
  documentId: string;
  name: string;
  role: string;
  physicalAndPsychologicalTraits: string;
  motivations: string;
  conflicts: string;
  relationships: string;
  arcEvolution: string;
  keyQuote: string;
  socraticDilemma: string;
}

export interface UserProgress {
  totalTextsRead: number;
  totalTimeMinutes: number;
  literalInteractions: number;
  inferentialInteractions: number;
  criticalInteractions: number;
  examsTaken: number;
  averageExamScore: number;
  vocabularyWordsSaved: number;
  levelScores: {
    literal: number; // 0-100
    inferential: number;
    critical: number;
  };
  achievements: {
    id: string;
    title: string;
    description: string;
    unlocked: boolean;
    icon: string;
  }[];
}

export interface AppSettings {
  role: UserRole;
  educationLevel: EducationLevel;
  userName: string;
  fontSize: 'sm' | 'base' | 'lg' | 'xl';
  readingFont: 'sans' | 'serif';
  autoSpeechRate: number;
  autoSpeakQuestions: boolean;
}
