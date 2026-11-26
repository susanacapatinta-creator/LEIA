import React, { useState, useRef, useMemo } from 'react';
import {
  HelpCircle,
  Sparkles,
  CheckCircle2,
  XCircle,
  Lightbulb,
  RotateCcw,
  Award,
  Loader2,
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  StopCircle,
  History,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ComprehensionLevel, ExamData } from '../../types';
import { ExamGenerationProgress, requestExamGeneration } from '../../services/api';
import { AiAccountGateBanner } from '../auth/AuthModal';

const PRESET_COUNTS = [5, 10, 20, 40, 60, 80];
const QUESTIONS_PER_PAGE = 10;

export const ExamGeneratorView: React.FC = () => {
  const {
    activeDocument,
    exams,
    activeExam,
    setActiveExam,
    saveExam,
    updateExamProgress,
    setActiveModule,
    currentUser,
    openAuthModal,
  } = useApp();

  const [questionCount, setQuestionCount] = useState<number>(10);
  const [examLevel, setExamLevel] = useState<string>('mixto');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState<ExamGenerationProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Student exam in-progress state
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [openAnswers, setOpenAnswers] = useState<Record<number, string>>({});
  const [revealedHints, setRevealedHints] = useState<Record<number, boolean>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Pagination and level filter for large 80-question exams
  const [currentPage, setCurrentPage] = useState(1);
  const [levelFilter, setLevelFilter] = useState<'all' | ComprehensionLevel>('all');

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleGenerateExam = async () => {
    if (!activeDocument) {
      setErrorMessage('Selecciona un documento primero para generar el examen.');
      return;
    }

    if (!currentUser) {
      openAuthModal('Crea tu cuenta gratuita o inicia sesión para generar exámenes con IA.');
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsGenerating(true);
    setGenProgress({
      generatedCount: 0,
      totalRequested: questionCount,
      currentBatch: 1,
      totalBatches: Math.ceil(questionCount / (questionCount <= 10 ? questionCount : 10)),
      sectionLabel: 'Preparando secciones del texto...',
    });
    setErrorMessage(null);
    setIsSubmitted(false);
    setAnswers({});
    setOpenAnswers({});
    setRevealedHints({});
    setCurrentPage(1);
    setLevelFilter('all');

    try {
      const generated = await requestExamGeneration({
        documentTitle: activeDocument.title,
        documentText: activeDocument.content,
        questionsCount: questionCount,
        level: examLevel,
        onProgress: (p) => setGenProgress(p),
        signal: controller.signal,
      });

      generated.documentId = activeDocument.id;
      saveExam(generated);
      setActiveExam(generated);
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('cancelada')) {
        setErrorMessage('Generación cancelada por el usuario.');
      } else {
        console.error(err);
        setErrorMessage(
          err?.message || 'No se pudo generar el examen con IA. Revisa la conexión con el servidor.'
        );
      }
    } finally {
      setIsGenerating(false);
      setGenProgress(null);
      abortControllerRef.current = null;
    }
  };

  const handleCancelGeneration = () => {
    abortControllerRef.current?.abort();
  };

  const handleSelectSavedExam = (exam: ExamData) => {
    setActiveExam(exam);
    setCurrentPage(1);
    setLevelFilter('all');
    setIsSubmitted(Boolean(exam.completed));

    const restoredAnswers: Record<number, number> = {};
    const restoredOpen: Record<number, string> = {};
    const restoredHints: Record<number, boolean> = {};
    exam.questions.forEach((q) => {
      if (q.selectedOptionIndex !== undefined) restoredAnswers[q.id] = q.selectedOptionIndex;
      if (q.openAnswer) restoredOpen[q.id] = q.openAnswer;
      if (q.revealedHint) restoredHints[q.id] = true;
    });
    setAnswers(restoredAnswers);
    setOpenAnswers(restoredOpen);
    setRevealedHints(restoredHints);
  };

  const handleOptionSelect = (qId: number, optIndex: number) => {
    if (isSubmitted) return;
    setAnswers((prev) => ({ ...prev, [qId]: optIndex }));
  };

  const handleOpenAnswerChange = (qId: number, text: string) => {
    if (isSubmitted) return;
    setOpenAnswers((prev) => ({ ...prev, [qId]: text }));
  };

  const toggleHint = (qId: number) => {
    setRevealedHints((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  const handleSubmitExam = () => {
    if (!activeExam) return;

    let totalScoreable = 0;
    let earnedScore = 0;

    const evaluatedQuestions = activeExam.questions.map((q) => {
      if (q.type === 'multiple_choice' && q.correctOptionIndex !== undefined) {
        totalScoreable += 1;
        const studentAns = answers[q.id];
        const isCorrect = studentAns === q.correctOptionIndex;
        if (isCorrect) earnedScore += 1;

        return {
          ...q,
          selectedOptionIndex: studentAns,
          isCorrect,
          revealedHint: Boolean(revealedHints[q.id]),
        };
      } else {
        return {
          ...q,
          openAnswer: openAnswers[q.id] || '',
          revealedHint: Boolean(revealedHints[q.id]),
        };
      }
    });

    const finalScore =
      totalScoreable > 0 ? Math.round((earnedScore / totalScoreable) * 100) : 100;

    const updated: ExamData = {
      ...activeExam,
      completed: true,
      score: finalScore,
      questions: evaluatedQuestions,
    };

    updateExamProgress(activeExam.id, updated);
    setIsSubmitted(true);
  };

  const filteredQuestions = useMemo(() => {
    if (!activeExam) return [];
    if (levelFilter === 'all') return activeExam.questions;
    return activeExam.questions.filter((q) => q.level === levelFilter);
  }, [activeExam, levelFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / QUESTIONS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedQuestions = useMemo(() => {
    const start = (safePage - 1) * QUESTIONS_PER_PAGE;
    return filteredQuestions.slice(start, start + QUESTIONS_PER_PAGE);
  }, [filteredQuestions, safePage]);

  const answeredCount = useMemo(() => {
    if (!activeExam) return 0;
    return activeExam.questions.filter((q) => {
      if (q.type === 'multiple_choice') return answers[q.id] !== undefined;
      return Boolean(openAnswers[q.id]?.trim());
    }).length;
  }, [activeExam, answers, openAnswers]);

  const levelCounts = useMemo(() => {
    const counts = { literal: 0, inferential: 0, critical: 0 };
    activeExam?.questions.forEach((q) => {
      if (q.level in counts) counts[q.level] += 1;
    });
    return counts;
  }, [activeExam]);

  if (!activeDocument) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center max-w-xl mx-auto my-12">
        <HelpCircle className="h-12 w-12 text-cyan-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white">No hay documento activo para examinar</h2>
        <p className="text-xs text-slate-400 mt-2">
          Selecciona una obra de la biblioteca o sube un documento PDF para formular hasta 80 preguntas de comprensión literal, inferencial y crítica.
        </p>
        <button
          onClick={() => setActiveModule('documents')}
          className="mt-6 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg"
        >
          Ir a Mis PDFs y Textos →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
          <HelpCircle className="h-6 w-6 text-amber-400" />
          <span>Generador de Exámenes y Evaluaciones Formativas</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Crea evaluaciones de hasta 80 preguntas sobre "{activeDocument.title}" repartidas por las distintas secciones de la obra.
        </p>
      </div>

      <AiAccountGateBanner moduleLabel="Generar Examen" />

      {/* Generator Configuration Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center space-x-1.5">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span>Configurar Evaluación Formativa</span>
          </span>
          <span className="text-xs text-slate-400">
            Capacidad extendida: 3 a 80 preguntas por lotes inteligentes
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Cantidad de preguntas
              </label>
              <div className="flex items-center space-x-1.5">
                <input
                  type="number"
                  min={3}
                  max={80}
                  disabled={isGenerating}
                  value={questionCount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) setQuestionCount(Math.min(80, Math.max(3, val)));
                  }}
                  className="w-16 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-center text-xs font-bold text-cyan-300 focus:border-indigo-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400">/ 80 máx.</span>
              </div>
            </div>

            <input
              type="range"
              min={3}
              max={80}
              step={1}
              disabled={isGenerating}
              value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-500 cursor-pointer"
            />

            <div className="grid grid-cols-6 gap-1.5">
              {PRESET_COUNTS.map((count) => (
                <button
                  key={count}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setQuestionCount(count)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50 ${
                    questionCount === count
                      ? 'bg-indigo-600 text-white shadow-md ring-1 ring-indigo-400/50'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-slate-300">
              Enfoque de comprensión
            </label>
            <select
              value={examLevel}
              disabled={isGenerating}
              onChange={(e) => setExamLevel(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            >
              <option value="mixto">Mixto (Literal, Inferencial y Crítico)</option>
              <option value="inferencial">Énfasis en Inferencia y Pistas</option>
              <option value="critico">Énfasis en Juicio Crítico y Argumentos</option>
              <option value="literal">Énfasis en Datos Textuales Directos</option>
            </select>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {questionCount > 10
                ? `Se generará en ${Math.ceil(questionCount / 10)} lotes progresivos cubriendo diferentes capítulos del texto sin repetir preguntas.`
                : 'Se generará en un único bloque rápido sobre el contenido seleccionado.'}
            </p>
          </div>
        </div>

        {/* Real-time batch progress bar */}
        {isGenerating && genProgress && (
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/30 p-4 space-y-2.5 animate-in fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-indigo-200 flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                <span>
                  Lote {genProgress.currentBatch} de {genProgress.totalBatches} • {genProgress.sectionLabel}
                </span>
              </span>
              <span className="font-bold text-cyan-300">
                {genProgress.generatedCount} / {genProgress.totalRequested} preguntas
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(
                    6,
                    Math.round((genProgress.generatedCount / genProgress.totalRequested) * 100)
                  )}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              LEIA está formulando preguntas con pistas socráticas y referencias textuales sin duplicar temas.
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-200 flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
          {exams.length > 0 && (
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <History className="h-4 w-4 text-indigo-400" />
              <span>Historial:</span>
              <select
                value={activeExam?.id || ''}
                onChange={(e) => {
                  const found = exams.find((ex) => ex.id === e.target.value);
                  if (found) handleSelectSavedExam(found);
                }}
                className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-200 max-w-[220px] focus:outline-none focus:border-indigo-500"
              >
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title.slice(0, 38)} ({ex.questions.length} preg.)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="ml-auto flex items-center space-x-2">
            {isGenerating && (
              <button
                type="button"
                onClick={handleCancelGeneration}
                className="flex items-center space-x-1.5 rounded-xl border border-rose-500/40 bg-rose-950/50 hover:bg-rose-900/60 text-rose-200 font-semibold text-xs px-4 py-2.5 transition-all cursor-pointer"
              >
                <StopCircle className="h-4 w-4" />
                <span>Cancelar</span>
              </button>
            )}

            <button
              onClick={handleGenerateExam}
              disabled={isGenerating}
              className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs px-6 py-2.5 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
                  <span>Generando {questionCount} preguntas...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-cyan-300" />
                  <span>Generar Evaluación ({questionCount} Preguntas)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Active Exam Rendering */}
      {activeExam && (
        <div className="space-y-6">
          {/* Exam Header */}
          <div className="rounded-2xl border border-indigo-500/30 bg-slate-900 p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-semibold text-cyan-400">
                  Evaluación sobre: {activeExam.documentTitle || activeDocument.title}
                </span>
                <h2 className="text-xl font-bold text-white mt-0.5">{activeExam.title}</h2>
              </div>

              <div className="flex items-center space-x-3">
                <div className="bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-right">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Respondidas</div>
                  <div className="text-sm font-extrabold text-cyan-300">
                    {answeredCount} / {activeExam.questions.length}
                  </div>
                </div>

                {isSubmitted && (
                  <div className="flex items-center space-x-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                    <Award className="h-5 w-5 text-amber-400" />
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Calificación</div>
                      <div className="text-lg font-extrabold text-white">{activeExam.score || 0}%</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{activeExam.instructions}</p>

            {/* Filter tabs & Pagination summary */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
              <div className="flex flex-wrap gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setLevelFilter('all');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    levelFilter === 'all'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Todas ({activeExam.questions.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLevelFilter('literal');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    levelFilter === 'literal'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-950 text-emerald-300/80 hover:text-emerald-200 border border-slate-800'
                  }`}
                >
                  Literal ({levelCounts.literal})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLevelFilter('inferential');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    levelFilter === 'inferential'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-950 text-indigo-300/80 hover:text-indigo-200 border border-slate-800'
                  }`}
                >
                  Inferencial ({levelCounts.inferential})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLevelFilter('critical');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    levelFilter === 'critical'
                      ? 'bg-amber-600 text-slate-950'
                      : 'bg-slate-950 text-amber-300/80 hover:text-amber-200 border border-slate-800'
                  }`}
                >
                  Crítico ({levelCounts.critical})
                </button>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center space-x-2 text-xs">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                    aria-label="Página anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-slate-300 font-semibold">
                    Bloque {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                    aria-label="Página siguiente"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Questions List (Paginated 10 per page) */}
          <div className="space-y-5">
            {paginatedQuestions.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-xs text-slate-400">
                No hay preguntas registradas en este filtro de nivel.
              </div>
            ) : (
              paginatedQuestions.map((question) => {
                const isMultipleChoice = question.type === 'multiple_choice';
                const studentAnswer = answers[question.id];
                const isHintOpen = revealedHints[question.id];
                const globalIndex = activeExam.questions.findIndex((q) => q.id === question.id);

                return (
                  <div
                    key={question.id}
                    className={`rounded-2xl border p-6 transition-all ${
                      isSubmitted && isMultipleChoice
                        ? studentAnswer === question.correctOptionIndex
                          ? 'border-emerald-500/40 bg-emerald-950/15'
                          : 'border-rose-500/40 bg-rose-950/15'
                        : 'border-slate-800 bg-slate-900/60'
                    }`}
                  >
                    {/* Question Header & Level Tag */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-bold text-indigo-400">
                        Pregunta {globalIndex >= 0 ? globalIndex + 1 : question.id} de{' '}
                        {activeExam.questions.length}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                          question.level === 'literal'
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : question.level === 'inferential'
                            ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        Nivel {question.level}
                      </span>
                    </div>

                    {/* Prompt */}
                    <h3 className="text-sm sm:text-base font-semibold text-white mb-4 leading-relaxed">
                      {question.prompt}
                    </h3>

                    {/* Multiple Choice Options */}
                    {isMultipleChoice && question.options && (
                      <div className="space-y-2.5">
                        {question.options.map((option, optIdx) => {
                          const isSelected = studentAnswer === optIdx;
                          const isCorrectAnswer = optIdx === question.correctOptionIndex;

                          let optionStyle =
                            'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-950';

                          if (isSelected && !isSubmitted) {
                            optionStyle =
                              'border-indigo-500 bg-indigo-950/50 text-white shadow-sm ring-1 ring-indigo-500/30';
                          } else if (isSubmitted) {
                            if (isCorrectAnswer) {
                              optionStyle =
                                'border-emerald-500 bg-emerald-950/40 text-emerald-200 font-semibold ring-1 ring-emerald-500/40';
                            } else if (isSelected && !isCorrectAnswer) {
                              optionStyle =
                                'border-rose-500 bg-rose-950/40 text-rose-200 line-through opacity-80';
                            }
                          }

                          return (
                            <button
                              key={optIdx}
                              type="button"
                              disabled={isSubmitted}
                              onClick={() => handleOptionSelect(question.id, optIdx)}
                              className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm flex items-start space-x-3 transition-all cursor-pointer ${optionStyle}`}
                            >
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-700 text-[11px] font-bold text-slate-400">
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span className="flex-1">{option}</span>
                              {isSubmitted && isCorrectAnswer && (
                                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                              )}
                              {isSubmitted && isSelected && !isCorrectAnswer && (
                                <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Open development question */}
                    {!isMultipleChoice && (
                      <div className="space-y-2">
                        <textarea
                          rows={3}
                          disabled={isSubmitted}
                          value={openAnswers[question.id] || ''}
                          onChange={(e) => handleOpenAnswerChange(question.id, e.target.value)}
                          placeholder="Escribe tu respuesta argumentada citando o haciendo referencia a lo expuesto en el texto..."
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-serif-reading leading-relaxed"
                        />
                        {question.rubricCriteria && (
                          <p className="text-[11px] text-slate-400 italic">
                            <span className="font-semibold text-slate-300">Criterio de evaluación:</span>{' '}
                            {question.rubricCriteria}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Socratic Hint & Text Evidence Section */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col space-y-2">
                      <div className="flex items-center justify-between text-xs gap-2">
                        {question.socraticHint && (
                          <button
                            type="button"
                            onClick={() => toggleHint(question.id)}
                            className="inline-flex items-center space-x-1.5 text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                          >
                            <Lightbulb className="h-3.5 w-3.5" />
                            <span>{isHintOpen ? 'Ocultar pista socrática' : 'Pedir pista socrática'}</span>
                          </button>
                        )}

                        {isSubmitted && question.textualEvidenceLocation && (
                          <span className="text-[11px] text-indigo-300 italic text-right">
                            Ref: {question.textualEvidenceLocation}
                          </span>
                        )}
                      </div>

                      {isHintOpen && question.socraticHint && (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-200 animate-in fade-in">
                          <p className="font-semibold flex items-center space-x-1 mb-1">
                            <Sparkles className="h-3 w-3 text-amber-400" />
                            <span>Pista pedagógica de LEIA:</span>
                          </p>
                          <p>{question.socraticHint}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Pagination Controls for 80-question navigation */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-3 text-xs">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => {
                  setCurrentPage((p) => Math.max(1, p - 1));
                  window.scrollTo({ top: 320, behavior: 'smooth' });
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Bloque anterior</span>
              </button>

              <div className="flex flex-wrap items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => {
                      setCurrentPage(pageNum);
                      window.scrollTo({ top: 320, behavior: 'smooth' });
                    }}
                    className={`h-7 min-w-[28px] px-2 rounded-lg font-bold transition-all cursor-pointer ${
                      safePage === pageNum
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => {
                  setCurrentPage((p) => Math.min(totalPages, p + 1));
                  window.scrollTo({ top: 320, behavior: 'smooth' });
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              >
                <span>Siguiente bloque</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Submit Actions */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-xs text-slate-400">
              {isSubmitted
                ? 'Evaluación completada y registrada en tu progreso.'
                : `Has respondido ${answeredCount} de ${activeExam.questions.length} preguntas. Puedes navegar entre bloques antes de enviar.`}
            </div>

            <div className="flex items-center space-x-3">
              {isSubmitted ? (
                <button
                  onClick={handleGenerateExam}
                  className="flex items-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white px-5 py-2.5 shadow transition-all cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Nuevo Examen</span>
                </button>
              ) : (
                <button
                  onClick={handleSubmitExam}
                  className="flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs px-6 py-2.5 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>Enviar y Calificar Evaluación</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
