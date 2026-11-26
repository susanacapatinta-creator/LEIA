import React, { useState, useEffect } from 'react';
import {
  Compass,
  Sparkles,
  BookOpen,
  Calendar,
  Layers,
  Feather,
  HelpCircle,
  Loader2,
  AlertCircle,
  Quote,
  Lightbulb,
  CheckCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LiteraryAnalysisData } from '../../types';
import { requestLiteraryAnalysis } from '../../services/api';
import { AiAccountGateBanner } from '../auth/AuthModal';

export const LiteraryAnalysisView: React.FC = () => {
  const {
    activeDocument,
    literaryAnalyses,
    saveLiteraryAnalysis,
    setActiveModule,
    currentUser,
    openAuthModal,
  } = useApp();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const docId = activeDocument?.id || 'default';
  const currentAnalysis = literaryAnalyses[docId];

  const handleGenerateAnalysis = async () => {
    if (!activeDocument) return;

    if (!currentUser) {
      openAuthModal('Crea tu cuenta gratuita o inicia sesión para generar el análisis literario con IA.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await requestLiteraryAnalysis({
        documentTitle: activeDocument.title,
        documentText: activeDocument.content,
      });

      data.documentId = activeDocument.id;
      saveLiteraryAnalysis(activeDocument.id, data);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err?.message || 'No se pudo generar el análisis literario. Revisa la conexión con el servidor.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!activeDocument) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center max-w-xl mx-auto my-12">
        <Compass className="h-12 w-12 text-cyan-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white">No hay documento activo para analizar</h2>
        <p className="text-xs text-slate-400 mt-2">
          Selecciona una obra de la biblioteca o sube un documento PDF para guiar el análisis de contexto, género, corriente y figuras retóricas.
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
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
            <Compass className="h-6 w-6 text-purple-400" />
            <span>Guía de Análisis Literario y Hermenéutico</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Análisis profundo de "{activeDocument.title}" en contexto histórico, corriente estilística, temas y recursos retóricos.
          </p>
        </div>

        <button
          onClick={handleGenerateAnalysis}
          disabled={isLoading}
          className="inline-flex items-center space-x-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 font-bold text-xs shadow-lg shadow-purple-600/20 transition-all cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Analizando con LEIA...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-cyan-300" />
              <span>{currentAnalysis ? 'Actualizar Análisis' : 'Iniciar Análisis Literario'}</span>
            </>
          )}
        </button>
      </div>

      <AiAccountGateBanner moduleLabel="Análisis Literario" />

      {errorMessage && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-xs text-rose-200 flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Analysis Presentation */}
      {!currentAnalysis && !isLoading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mx-auto">
            <Layers className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-white">Descubre las capas profundas del texto</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            LEIA examinará la obra para desentrañar el género, la corriente literaria, la atmósfera sociopolítica en que fue concebida y las figuras retóricas con sus respectivas citas textuales.
          </p>
          <button
            onClick={handleGenerateAnalysis}
            className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md"
          >
            Generar Guía de Análisis Literario
          </button>
        </div>
      ) : isLoading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-16 text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-purple-400 mx-auto" />
          <h3 className="text-base font-bold text-white">Analizando estructura y estética...</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Identificando recursos expresivos, contexto epocal y líneas temáticas del texto.
          </p>
        </div>
      ) : (
        currentAnalysis && (
          <div className="space-y-6">
            {/* Top Grid: Genre, Movement & Historical Context */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Genre */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg">
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-purple-400 mb-2">
                  <BookOpen className="h-4 w-4" />
                  <span>Género y Subgénero</span>
                </div>
                <p className="text-sm font-semibold text-white leading-relaxed">
                  {currentAnalysis.genre}
                </p>
              </div>

              {/* Movement */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg">
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2">
                  <Layers className="h-4 w-4" />
                  <span>Corriente Literaria</span>
                </div>
                <p className="text-sm font-semibold text-white leading-relaxed">
                  {currentAnalysis.literaryMovement}
                </p>
              </div>

              {/* Historical Context */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg">
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
                  <Calendar className="h-4 w-4" />
                  <span>Contexto Histórico</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentAnalysis.historicalContext}
                </p>
              </div>
            </div>

            {/* Central Themes */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                <Feather className="h-4 w-4 text-purple-400" />
                <span>Temas Centrales y Motivos Recurrentes</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {currentAnalysis.mainThemes.map((theme, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-purple-500/20 bg-purple-950/20 p-4 text-xs font-semibold text-purple-200 flex items-start space-x-2"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-500/30 text-[10px] text-purple-300 font-bold">
                      {idx + 1}
                    </span>
                    <span className="leading-snug">{theme}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Expressive Resources & Rhetorical Figures */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-cyan-400" />
                  <span>Recursos Expresivos y Figuras Retóricas</span>
                </span>
                <span className="text-xs text-slate-400">Evidenciados en el texto con su efecto estético</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentAnalysis.expressiveResources.map((res, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <span className="inline-block rounded-md bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300 mb-2">
                        {res.figure}
                      </span>
                      <blockquote className="rounded-lg bg-slate-900 p-2.5 text-xs text-indigo-200 italic font-serif-reading border-l-2 border-indigo-400">
                        <Quote className="h-3 w-3 inline mr-1 text-cyan-400" />
                        "{res.exampleQuote}"
                      </blockquote>
                    </div>

                    <div className="pt-2 text-[11px] text-slate-300">
                      <span className="font-semibold text-slate-400">Efecto en el lector:</span> {res.effect}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Socratic Debate Challenges */}
            {currentAnalysis.socraticChallenges && currentAnalysis.socraticChallenges.length > 0 && (
              <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-900 p-6 shadow-xl space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                  <Lightbulb className="h-4 w-4" />
                  <span>Retos Socráticos para Debate en Clase</span>
                </div>

                <div className="space-y-2.5">
                  {currentAnalysis.socraticChallenges.map((challenge, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-amber-500/20 bg-slate-950/60 p-3.5 text-xs text-amber-200 flex items-start space-x-3"
                    >
                      <span className="font-bold text-amber-400">#{idx + 1}</span>
                      <p className="leading-relaxed">{challenge}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
};
