import React, { useState } from 'react';
import {
  BookA,
  Sparkles,
  Search,
  CheckCircle2,
  Trash2,
  HelpCircle,
  Lightbulb,
  ArrowRight,
  Loader2,
  AlertCircle,
  Bookmark,
  Share2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { VocabularyWord } from '../../types';
import { requestVocabularyDeduction } from '../../services/api';
import { AiAccountGateBanner } from '../auth/AuthModal';

export const VocabularyView: React.FC = () => {
  const {
    activeDocument,
    vocabularyList,
    addVocabularyWord,
    toggleVocabularyMastered,
    deleteVocabularyWord,
    setActiveModule,
    currentUser,
    openAuthModal,
  } = useApp();

  const [targetWord, setTargetWord] = useState('');
  const [sentenceContext, setSentenceContext] = useState('');
  const [studentDeduction, setStudentDeduction] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [latestAnalysis, setLatestAnalysis] = useState<VocabularyWord | null>(null);

  // Suggested words for the active document
  const sampleSuggestions: Record<string, { word: string; sentence: string }[]> = {
    'sample-quijote': [
      {
        word: 'Desaforados',
        sentence: '...donde se descubren treinta o pocos más desaforados gigantes...',
      },
      {
        word: 'Rodela',
        sentence: '...bien cubierto de su rodela, con la lanza en el ristre...',
      },
      {
        word: 'Ristre',
        sentence: '...con la lanza en el ristre, arremetió a todo el galope de Rocinante...',
      },
      {
        word: 'Simiente',
        sentence: '...es gran servicio de Dios quitar tan mala simiente de sobre la faz de la tierra...',
      },
    ],
    'sample-quiroga': [
      {
        word: 'Impasible',
        sentence: '...el impasible semblante de su esposo la contenía siempre...',
      },
      {
        word: 'Estuco',
        sentence: '...el brillo glacial del estuco, sin el más leve rasguño en las altas paredes...',
      },
      {
        word: 'Antropoide',
        sentence: '...hubo un monstruo antropoide, apoyado en el alfombrado...',
      },
      {
        word: 'Lívida',
        sentence: '...la sirvienta lo dejó caer, y se quedó mirando a aquél, lívida y temblando...',
      },
    ],
    'sample-ensayo-ia': [
      {
        word: 'Mayéutica',
        sentence: '...sino reivindicar la mayéutica socrática como escudo y brújula...',
      },
      {
        word: 'Epistémica',
        sentence: '...abdica progresivamente de su autonomía epistémica...',
      },
      {
        word: 'Paradoja',
        sentence: '...es el tropiezo con una paradoja, la incomodidad de no entender a la primera...',
      },
    ],
  };

  const currentSuggestions = activeDocument?.id ? sampleSuggestions[activeDocument.id] || [] : [];

  const handleApplySuggestion = (s: { word: string; sentence: string }) => {
    setTargetWord(s.word);
    setSentenceContext(s.sentence);
    setStudentDeduction('');
    setErrorMessage(null);
  };

  const handleAnalyzeWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetWord.trim()) {
      setErrorMessage('Por favor ingresa la palabra desconocida.');
      return;
    }

    if (!studentDeduction.trim()) {
      setErrorMessage(
        '¡Regla pedagógica de LEIA! Primero intenta deducir qué crees que significa basándote en la oración y el contexto.'
      );
      return;
    }

    if (!currentUser) {
      openAuthModal('Crea tu cuenta gratuita o inicia sesión para evaluar tu vocabulario con IA.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await requestVocabularyDeduction({
        word: targetWord.trim(),
        sentenceContext: sentenceContext.trim(),
        studentDeduction: studentDeduction.trim(),
        documentTitle: activeDocument?.title || 'Lectura de estudio',
      });

      const newWordEntry: VocabularyWord = {
        ...res,
        id: `vocab-${Date.now()}`,
        documentId: activeDocument?.id || 'doc',
        word: targetWord.trim(),
        sentenceContext: sentenceContext.trim(),
        studentDeduction: studentDeduction.trim(),
        mastered: false,
        dateAdded: new Date().toISOString().slice(0, 10),
      };

      addVocabularyWord(newWordEntry);
      setLatestAnalysis(newWordEntry);
      setTargetWord('');
      setSentenceContext('');
      setStudentDeduction('');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err?.message || 'No se pudo analizar el vocabulario con LEIA. Revisa la conexión con el servidor.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
          <BookA className="h-6 w-6 text-teal-400" />
          <span>Vocabulario Contextual y Deducción Socrática</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Aprende vocabulario por inferencia: primero formula tu propia hipótesis analizando el contexto y luego LEIA evaluará tu razonamiento.
        </p>
      </div>

      <AiAccountGateBanner moduleLabel="Vocabulario" />

      {/* Word Deduction Form */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center space-x-1.5">
            <Sparkles className="h-4 w-4 text-teal-400" />
            <span>Módulo de Inferencia Léxica</span>
          </span>
          <span className="text-xs text-slate-400">Paso 1: Contexto → Paso 2: Tu Hipótesis → Paso 3: Guía LEIA</span>
        </div>

        {/* Quick suggestions for active text */}
        {currentSuggestions.length > 0 && (
          <div>
            <div className="text-xs text-slate-400 font-semibold mb-2">
              Términos sugeridos en "{activeDocument?.title}":
            </div>
            <div className="flex flex-wrap gap-2">
              {currentSuggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplySuggestion(s)}
                  className="rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-300 hover:border-teal-500 hover:text-teal-300 transition-colors"
                >
                  {s.word}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleAnalyzeWord} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Palabra difícil o desconocida *
              </label>
              <input
                type="text"
                required
                value={targetWord}
                onChange={(e) => setTargetWord(e.target.value)}
                placeholder="Ej. Impasible, Desafuero..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Oración o contexto donde aparece en el texto
              </label>
              <input
                type="text"
                value={sentenceContext}
                onChange={(e) => setSentenceContext(e.target.value)}
                placeholder="Pega la frase del libro donde está la palabra..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-teal-300 mb-1 flex items-center space-x-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
              <span>Tu deducción personal: ¿Qué crees que significa según la situación? *</span>
            </label>
            <textarea
              required
              rows={2}
              value={studentDeduction}
              onChange={(e) => setStudentDeduction(e.target.value)}
              placeholder="Ejemplo: 'Creo que significa que no se inmuta o no tiene emociones, porque en el párrafo dice que camina en silencio y tiene un rostro frío...'"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-200 flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs px-6 py-2.5 shadow-lg shadow-teal-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>LEIA evaluando tu hipótesis léxica...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Evaluar Deducción y Obtener Significado</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Latest Analysis Result Card */}
      {latestAnalysis && (
        <div className="rounded-2xl border border-teal-500/40 bg-gradient-to-br from-teal-950/30 via-slate-900 to-slate-900 p-6 shadow-xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold text-white capitalize">{latestAnalysis.word}</span>
              <span className="rounded bg-teal-500/20 px-2 py-0.5 text-[10px] font-bold text-teal-300 border border-teal-500/30">
                Analizada por LEIA
              </span>
            </div>
            <span className="text-xs text-slate-400 italic">
              {latestAnalysis.dateAdded}
            </span>
          </div>

          {/* Student deduction feedback */}
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4">
            <p className="text-xs font-bold text-indigo-300 flex items-center space-x-1.5 mb-1">
              <CheckCircle2 className="h-4 w-4 text-indigo-400" />
              <span>Retroalimentación a tu hipótesis:</span>
            </p>
            <p className="text-xs text-slate-200 leading-relaxed">
              {latestAnalysis.studentEvaluation}
            </p>
          </div>

          {/* Contextual Meaning */}
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Significado Contextual en la Obra
            </span>
            <p className="text-sm font-semibold text-white leading-relaxed">
              {latestAnalysis.contextualMeaning}
            </p>
          </div>

          {/* Etymology / Morphemes */}
          {latestAnalysis.etymologyOrMorphemes && (
            <div className="space-y-1 text-xs">
              <span className="font-bold text-slate-400">Etimología y Raíces Clave:</span>
              <p className="text-slate-300">{latestAnalysis.etymologyOrMorphemes}</p>
            </div>
          )}

          {/* Synonyms in Context */}
          {latestAnalysis.synonymsInContext && latestAnalysis.synonymsInContext.length > 0 && (
            <div className="flex items-center space-x-2 text-xs">
              <span className="font-bold text-slate-400">Sinónimos afines:</span>
              <div className="flex flex-wrap gap-1.5">
                {latestAnalysis.synonymsInContext.map((syn, idx) => (
                  <span
                    key={idx}
                    className="rounded-md bg-slate-800 px-2 py-0.5 text-xs text-teal-300 font-medium"
                  >
                    {syn}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Socratic Reflection Prompt */}
          {latestAnalysis.socraticReflectionQuestion && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 text-xs text-amber-200">
              <span className="font-bold flex items-center space-x-1.5 mb-1">
                <Lightbulb className="h-4 w-4 text-amber-400" />
                <span>Desafío de reflexión socrática:</span>
              </span>
              <p>{latestAnalysis.socraticReflectionQuestion}</p>
            </div>
          )}
        </div>
      )}

      {/* Saved Vocabulary Glossary */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Bookmark className="h-5 w-5 text-teal-400" />
            <span>Glosario Personal Guardado ({vocabularyList.length})</span>
          </h2>
          <span className="text-xs text-slate-400">Palabras analizadas por deducción</span>
        </div>

        {vocabularyList.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400 text-xs">
            Aún no has guardado palabras en tu glosario. ¡Usa el formulario superior para deducir tu primera palabra!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vocabularyList.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between shadow-sm space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-base text-white capitalize">{item.word}</h3>
                      <p className="text-[11px] text-teal-300 italic mt-0.5">
                        "{item.sentenceContext}"
                      </p>
                    </div>

                    <button
                      onClick={() => toggleVocabularyMastered(item.id)}
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold border transition-all ${
                        item.mastered
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      {item.mastered ? '✓ Dominada' : 'En estudio'}
                    </button>
                  </div>

                  <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                    {item.contextualMeaning}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span className="text-[10px]">Agregada el {item.dateAdded}</span>
                  <button
                    onClick={() => deleteVocabularyWord(item.id)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                    title="Eliminar de mi glosario"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
