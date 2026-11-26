import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  DocumentItem,
  ComprehensionLevel,
  ChatMessage,
  ExamData,
  VocabularyWord,
  LiteraryAnalysisData,
  CharacterProfile,
  UserProgress,
  AppSettings,
  UserRole,
  EducationLevel,
} from '../types';
import {
  checkServerHealth,
  HealthStatus,
  AuthUser,
  setAuthToken,
  registerAuthRequiredHandler,
  logoutAccount,
} from '../services/api';
import {
  loadAllDocumentsFromDB,
  saveDocumentToDB,
  deleteDocumentFromDB,
} from '../services/documentStorage';

export type ActiveModule =
  | 'home'
  | 'documents'
  | 'guided_reading'
  | 'read_aloud'
  | 'exam'
  | 'vocabulary'
  | 'literary_analysis'
  | 'characters'
  | 'progress'
  | 'settings';

interface AppContextType {
  activeModule: ActiveModule;
  setActiveModule: (mod: ActiveModule) => void;
  // Documents
  documents: DocumentItem[];
  activeDocument: DocumentItem | null;
  setActiveDocument: (doc: DocumentItem | null) => void;
  addDocument: (doc: DocumentItem) => void;
  deleteDocument: (id: string) => void;
  // Comprehension Level
  activeLevel: ComprehensionLevel;
  setActiveLevel: (level: ComprehensionLevel) => void;
  // Guided Chat per document
  chatMessages: Record<string, ChatMessage[]>;
  addChatMessage: (docId: string, message: ChatMessage) => void;
  clearChatHistory: (docId: string) => void;
  // Exams
  exams: ExamData[];
  activeExam: ExamData | null;
  setActiveExam: (exam: ExamData | null) => void;
  saveExam: (exam: ExamData) => void;
  updateExamProgress: (examId: string, updatedExam: ExamData) => void;
  // Vocabulary
  vocabularyList: VocabularyWord[];
  addVocabularyWord: (word: VocabularyWord) => void;
  toggleVocabularyMastered: (id: string) => void;
  deleteVocabularyWord: (id: string) => void;
  // Literary Analysis Cache
  literaryAnalyses: Record<string, LiteraryAnalysisData>;
  saveLiteraryAnalysis: (docId: string, data: LiteraryAnalysisData) => void;
  // Characters Cache
  characterDossiers: Record<string, CharacterProfile[]>;
  saveCharacterDossiers: (docId: string, characters: CharacterProfile[]) => void;
  // Progress & Stats
  progress: UserProgress;
  recordInteraction: (level: ComprehensionLevel) => void;
  // Settings
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  // Health
  serverHealth: HealthStatus | null;
  refreshHealth: () => Promise<void>;
  // Auth (Open registration for everyone without requiring a Gemini account)
  currentUser: AuthUser | null;
  authModalOpen: boolean;
  authModalReason: string | null;
  openAuthModal: (reason?: string) => void;
  closeAuthModal: () => void;
  completeAuthSession: (token: string, user: AuthUser) => void;
  logout: () => Promise<void>;
}

const defaultSettings: AppSettings = {
  role: 'estudiante',
  educationLevel: 'secundaria',
  userName: 'Estudiante',
  fontSize: 'base',
  readingFont: 'serif',
  autoSpeechRate: 1.0,
  autoSpeakQuestions: false,
};

const defaultProgress: UserProgress = {
  totalTextsRead: 2,
  totalTimeMinutes: 45,
  literalInteractions: 8,
  inferentialInteractions: 12,
  criticalInteractions: 6,
  examsTaken: 1,
  averageExamScore: 85,
  vocabularyWordsSaved: 4,
  levelScores: {
    literal: 78,
    inferential: 65,
    critical: 52,
  },
  achievements: [
    {
      id: 'first-pdf',
      title: 'Explorador de Textos',
      description: 'Cargaste tu primer documento o fragmento en LEIA.',
      unlocked: true,
      icon: 'FileText',
    },
    {
      id: 'socratic-mind',
      title: 'Pensamiento Crítico',
      description: 'Completaste una sesión de preguntas en nivel Crítico.',
      unlocked: true,
      icon: 'Brain',
    },
    {
      id: 'lexicon-builder',
      title: 'Constructor de Léxico',
      description: 'Descubriste y dedujiste el significado de 3 palabras desconocidas.',
      unlocked: true,
      icon: 'BookOpen',
    },
    {
      id: 'master-inquisitor',
      title: 'Espíritu Socrático',
      description: 'Sustentaste una respuesta con evidencia directa del texto.',
      unlocked: false,
      icon: 'Sparkles',
    },
  ],
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeModule, setActiveModule] = useState<ActiveModule>('home');
  const [serverHealth, setServerHealth] = useState<HealthStatus | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalReason, setAuthModalReason] = useState<string | null>(null);

  // Documents (loaded from IndexedDB to support 1000+ page books)
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  const [activeDocument, setActiveDocument] = useState<DocumentItem | null>(null);

  useEffect(() => {
    let mounted = true;
    loadAllDocumentsFromDB().then((loaded) => {
      if (!mounted) return;
      if (loaded.length > 0) {
        setDocuments(loaded);
        setActiveDocument((prev) => {
          if (prev && loaded.some((d) => d.id === prev.id)) {
            return loaded.find((d) => d.id === prev.id) || loaded[0];
          }
          return loaded[0];
        });
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Active Comprehension Level
  const [activeLevel, setActiveLevel] = useState<ComprehensionLevel>('inferential');

  // Chat Histories
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>(() => {
    const saved = localStorage.getItem('leia_chats');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing stored chats', e);
      }
    }
    return {
      'sample-quijote': [
        {
          id: 'welcome-q',
          role: 'assistant',
          text: '¡Hola! Soy LEIA, tu tutora socrática. Estamos en el capítulo VIII de Don Quijote. Actualmente trabajamos el nivel INFERENCIAL. ¿Por qué crees que Don Quijote insiste en ver gigantes donde Sancho ve molinos? ¿Qué necesidad psicológica o vocacional lo ciega ante la realidad?',
          timestamp: new Date().toISOString(),
          level: 'inferential',
        },
      ],
      'sample-quiroga': [
        {
          id: 'welcome-quiroga',
          role: 'assistant',
          text: 'Bienvenido a "El almohadón de plumas" de Horacio Quiroga. ¿Te has fijado en la descripción de la casa de mármol y estuco blanco? ¿Qué atmósfera emocional sugiere y qué presagio inferencial notas antes de que Alicia enferme?',
          timestamp: new Date().toISOString(),
          level: 'inferential',
        },
      ],
    };
  });

  // Exams
  const [exams, setExams] = useState<ExamData[]>(() => {
    const saved = localStorage.getItem('leia_exams');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  const [activeExam, setActiveExam] = useState<ExamData | null>(null);

  // Vocabulary
  const [vocabularyList, setVocabularyList] = useState<VocabularyWord[]>(() => {
    const saved = localStorage.getItem('leia_vocabulary');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        id: 'v-1',
        documentId: 'sample-quijote',
        word: 'Desaforados',
        sentenceContext: '...donde se descubren treinta o pocos más desaforados gigantes...',
        studentDeduction: 'Parece significar gigantes enormes o sin control porque el prefijo des- da idea de que rompen las normas.',
        contextualMeaning: 'En este pasaje denota gigantes desmedidos, desmesurados y violentos, que desafían el orden moral y físico natural.',
        etymologyOrMorphemes: 'Del prefijo des- (privación) y fuero (ley, norma). Literalmente: que actúa fuera de la ley o desmedidamente.',
        socraticReflectionQuestion: '¿En qué situación actual podrías calificar una ambición o un gasto como "desaforado"?',
        synonymsInContext: ['desmesurados', 'monstruosos', 'inmensos'],
        mastered: true,
        dateAdded: '2026-10-20',
      },
      {
        id: 'v-2',
        documentId: 'sample-quiroga',
        word: 'Impasible',
        sentenceContext: '...pero el impasible semblante de su esposo la contenía siempre...',
        studentDeduction: 'Que no muestra sentimientos ni pasiones.',
        contextualMeaning: 'En la narración describe la frialdad e incapacidad de Jordán para manifestar afecto visible, lo que genera aislamiento emocional en Alicia.',
        etymologyOrMorphemes: 'Del latín impassibilis (in- "no" + passibilis "capaz de sentir dolor o emoción").',
        socraticReflectionQuestion: '¿Puede una persona amar intensamente a otra y sin embargo mantener un semblante impasible?',
        synonymsInContext: ['imperturbable', 'impenetrable', 'frío'],
        mastered: false,
        dateAdded: '2026-10-21',
      },
    ];
  });

  // Literary Analyses Cache
  const [literaryAnalyses, setLiteraryAnalyses] = useState<Record<string, LiteraryAnalysisData>>(() => {
    const saved = localStorage.getItem('leia_literary');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  });

  // Character Dossiers Cache
  const [characterDossiers, setCharacterDossiers] = useState<Record<string, CharacterProfile[]>>(() => {
    const saved = localStorage.getItem('leia_characters');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  });

  // Progress
  const [progress, setProgress] = useState<UserProgress>(() => {
    const saved = localStorage.getItem('leia_progress');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return defaultProgress;
  });

  // Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('leia_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return defaultSettings;
  });

  // Save light metadata changes safely to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('leia_chats', JSON.stringify(chatMessages));
    } catch (e) {
      console.warn('No se pudo guardar el historial de chat:', e);
    }
  }, [chatMessages]);

  useEffect(() => {
    try {
      localStorage.setItem('leia_exams', JSON.stringify(exams.slice(0, 10)));
    } catch (e) {
      console.warn('No se pudieron guardar todos los exámenes en localStorage:', e);
    }
  }, [exams]);

  useEffect(() => {
    try {
      localStorage.setItem('leia_vocabulary', JSON.stringify(vocabularyList));
    } catch (e) {}
  }, [vocabularyList]);

  useEffect(() => {
    try {
      localStorage.setItem('leia_literary', JSON.stringify(literaryAnalyses));
    } catch (e) {}
  }, [literaryAnalyses]);

  useEffect(() => {
    try {
      localStorage.setItem('leia_characters', JSON.stringify(characterDossiers));
    } catch (e) {}
  }, [characterDossiers]);

  useEffect(() => {
    try {
      localStorage.setItem('leia_progress', JSON.stringify(progress));
    } catch (e) {}
  }, [progress]);

  useEffect(() => {
    try {
      localStorage.setItem('leia_settings', JSON.stringify(settings));
    } catch (e) {}
  }, [settings]);

  // Check health on mount
  const refreshHealth = async () => {
    const h = await checkServerHealth();
    setServerHealth(h);
  };

  useEffect(() => {
    refreshHealth();
    registerAuthRequiredHandler((reason) => {
      setCurrentUser(null);
      setAuthToken(null);
      setAuthModalReason(
        reason || 'Crea tu cuenta gratuita o inicia sesión para utilizar las funciones de IA de LEIA.'
      );
      setAuthModalOpen(true);
    });
    return () => {
      registerAuthRequiredHandler(null);
    };
  }, []);

  const openAuthModal = (reason?: string) => {
    setAuthModalReason(reason || null);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
    setAuthModalReason(null);
  };

  const completeAuthSession = (token: string, user: AuthUser) => {
    setAuthToken(token);
    setCurrentUser(user);
    setSettings((prev) => ({
      ...prev,
      userName: user.name,
      role: user.role,
      educationLevel: user.educationLevel,
    }));
    setAuthModalOpen(false);
    setAuthModalReason(null);
  };

  const logout = async () => {
    await logoutAccount();
    setAuthToken(null);
    setCurrentUser(null);
  };

  const addDocument = (doc: DocumentItem) => {
    setDocuments((prev) => [doc, ...prev]);
    setActiveDocument(doc);
    saveDocumentToDB(doc).catch((err) =>
      console.error('Error guardando documento en IndexedDB:', err)
    );
    setProgress((prev) => ({
      ...prev,
      totalTextsRead: prev.totalTextsRead + 1,
    }));
  };

  const deleteDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    deleteDocumentFromDB(id).catch((err) =>
      console.error('Error eliminando documento de IndexedDB:', err)
    );
    if (activeDocument?.id === id) {
      const remaining = documents.filter((d) => d.id !== id);
      setActiveDocument(remaining[0] || null);
    }
  };

  const addChatMessage = (docId: string, message: ChatMessage) => {
    setChatMessages((prev) => ({
      ...prev,
      [docId]: [...(prev[docId] || []), message],
    }));
  };

  const clearChatHistory = (docId: string) => {
    setChatMessages((prev) => ({
      ...prev,
      [docId]: [],
    }));
  };

  const saveExam = (exam: ExamData) => {
    setExams((prev) => [exam, ...prev.filter((e) => e.id !== exam.id)]);
    setActiveExam(exam);
  };

  const updateExamProgress = (examId: string, updatedExam: ExamData) => {
    setExams((prev) => prev.map((e) => (e.id === examId ? updatedExam : e)));
    if (activeExam?.id === examId) {
      setActiveExam(updatedExam);
    }
    if (updatedExam.completed && updatedExam.score !== undefined) {
      setProgress((prev) => {
        const newCount = prev.examsTaken + 1;
        const newAvg = Math.round((prev.averageExamScore * prev.examsTaken + updatedExam.score!) / newCount);
        return {
          ...prev,
          examsTaken: newCount,
          averageExamScore: newAvg,
        };
      });
    }
  };

  const addVocabularyWord = (word: VocabularyWord) => {
    setVocabularyList((prev) => [word, ...prev]);
    setProgress((prev) => ({
      ...prev,
      vocabularyWordsSaved: prev.vocabularyWordsSaved + 1,
    }));
  };

  const toggleVocabularyMastered = (id: string) => {
    setVocabularyList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, mastered: !item.mastered } : item))
    );
  };

  const deleteVocabularyWord = (id: string) => {
    setVocabularyList((prev) => prev.filter((item) => item.id !== id));
  };

  const saveLiteraryAnalysis = (docId: string, data: LiteraryAnalysisData) => {
    setLiteraryAnalyses((prev) => ({
      ...prev,
      [docId]: data,
    }));
  };

  const saveCharacterDossiers = (docId: string, characters: CharacterProfile[]) => {
    setCharacterDossiers((prev) => ({
      ...prev,
      [docId]: characters,
    }));
  };

  const recordInteraction = (level: ComprehensionLevel) => {
    setProgress((prev) => {
      const field =
        level === 'literal'
          ? 'literalInteractions'
          : level === 'inferential'
          ? 'inferentialInteractions'
          : 'criticalInteractions';
      const updatedCount = prev[field] + 1;
      const boost = level === 'literal' ? 2 : level === 'inferential' ? 3 : 4;
      const currentScore = prev.levelScores[level];
      const newScore = Math.min(100, currentScore + boost);

      return {
        ...prev,
        [field]: updatedCount,
        totalTimeMinutes: prev.totalTimeMinutes + 2,
        levelScores: {
          ...prev.levelScores,
          [level]: newScore,
        },
      };
    });
  };

  const updateSettings = (partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  return (
    <AppContext.Provider
      value={{
        activeModule,
        setActiveModule,
        documents,
        activeDocument,
        setActiveDocument,
        addDocument,
        deleteDocument,
        activeLevel,
        setActiveLevel,
        chatMessages,
        addChatMessage,
        clearChatHistory,
        exams,
        activeExam,
        setActiveExam,
        saveExam,
        updateExamProgress,
        vocabularyList,
        addVocabularyWord,
        toggleVocabularyMastered,
        deleteVocabularyWord,
        literaryAnalyses,
        saveLiteraryAnalysis,
        characterDossiers,
        saveCharacterDossiers,
        progress,
        recordInteraction,
        settings,
        updateSettings,
        serverHealth,
        refreshHealth,
        currentUser,
        authModalOpen,
        authModalReason,
        openAuthModal,
        closeAuthModal,
        completeAuthSession,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
