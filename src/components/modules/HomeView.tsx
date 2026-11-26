import React from 'react';
import {
  BookOpen,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileText,
  MessageSquare,
  Volume2,
  HelpCircle,
  BookA,
  Compass,
  Users,
  Award,
  Layers,
  CheckCircle2,
  Smartphone,
  UserPlus,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MobileInstallModal } from '../pwa/PWAInstallUI';
import { AiAccountGateBanner } from '../auth/AuthModal';

export const HomeView: React.FC = () => {
  const [installModalOpen, setInstallModalOpen] = React.useState(false);
  const {
    activeDocument,
    setActiveModule,
    progress,
    settings,
    documents,
    setActiveDocument,
    currentUser,
    openAuthModal,
  } = useApp();

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-32 h-40 w-40 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-300 mb-4">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>Tutoría Socrática de Comprensión Lectora</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Bienvenido a LEIA, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-cyan-300 to-indigo-100">{settings.userName}</span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
            Tu asistente pedagógica para aprender a leer entre líneas, descubrir intenciones implícitas y defender tu pensamiento crítico. Aquí no recibirás resúmenes prefabricados: aprenderás a pensar con rigor y autonomía.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => setActiveModule('guided_reading')}
              className="inline-flex items-center space-x-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:from-indigo-500 hover:to-indigo-400 transition-all cursor-pointer"
            >
              <MessageSquare className="h-4 w-4 text-cyan-300" />
              <span>Iniciar Lectura Guiada</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setActiveModule('documents')}
              className="inline-flex items-center space-x-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
            >
              <FileText className="h-4 w-4 text-indigo-400" />
              <span>Subir un PDF o Texto</span>
            </button>
            <button
              onClick={() => setActiveModule('exam')}
              className="inline-flex items-center space-x-2 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-300 hover:bg-slate-900 transition-all cursor-pointer"
            >
              <HelpCircle className="h-4 w-4 text-amber-400" />
              <span>Generar Examen (hasta 80 preg.)</span>
            </button>
            <button
              onClick={() => setInstallModalOpen(true)}
              className="inline-flex items-center space-x-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2.5 text-xs sm:text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20 transition-all cursor-pointer"
            >
              <Smartphone className="h-4 w-4 text-cyan-300" />
              <span>Instalar en Celular / APK</span>
            </button>
            {!currentUser && (
              <button
                type="button"
                onClick={() => openAuthModal()}
                className="inline-flex items-center space-x-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg transition-all cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                <span>Crear Cuenta para usar IA</span>
              </button>
            )}
          </div>
        </div>
      </div>
      <AiAccountGateBanner />
      <MobileInstallModal open={installModalOpen} onClose={() => setInstallModalOpen(false)} />

      {/* Active Document Card & Level Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Document Spotlight */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center space-x-1.5">
                <BookOpen className="h-4 w-4" />
                <span>Documento Actual en Lectura</span>
              </span>
              <button
                onClick={() => setActiveModule('documents')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Cambiar texto →
              </button>
            </div>

            {activeDocument ? (
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-1">
                  {activeDocument.title}
                </h3>
                <p className="text-xs text-indigo-300 font-medium mb-3">
                  {activeDocument.author || 'Autor desconocido'} • {activeDocument.genre || 'Literatura'}
                </p>
                <p className="text-xs sm:text-sm text-slate-300 line-clamp-3 leading-relaxed mb-4">
                  {activeDocument.summary || activeDocument.content.slice(0, 240) + '...'}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span className="bg-slate-800 px-2.5 py-1 rounded-lg">
                    {activeDocument.wordCount.toLocaleString()} palabras
                  </span>
                  <span className="bg-slate-800 px-2.5 py-1 rounded-lg">
                    {activeDocument.pageCount || 1} página(s) estimada(s)
                  </span>
                  <span className="bg-slate-800 px-2.5 py-1 rounded-lg capitalize">
                    Origen: {activeDocument.sourceType === 'pdf' ? 'PDF subido' : 'Biblioteca'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400">
                <p>No tienes ningún texto seleccionado.</p>
                <button
                  onClick={() => setActiveModule('documents')}
                  className="mt-3 inline-flex items-center space-x-1.5 text-xs text-indigo-400 hover:underline"
                >
                  <span>Seleccionar uno de la biblioteca</span>
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">¿Listo para profundizar?</span>
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveModule('read_aloud')}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
              >
                <Volume2 className="h-3.5 w-3.5 text-cyan-400" />
                <span>Escuchar</span>
              </button>
              <button
                onClick={() => setActiveModule('guided_reading')}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 font-medium"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Interrogar texto</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3-Level Comprehension Progress Summary */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center space-x-1.5">
                <TrendingUp className="h-4 w-4 text-indigo-400" />
                <span>Progreso por Niveles</span>
              </span>
              <button
                onClick={() => setActiveModule('progress')}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                Detalles →
              </button>
            </div>

            <div className="space-y-4">
              {/* Literal */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-emerald-300">1. Nivel Literal</span>
                  <span className="text-slate-400">{progress.levelScores.literal}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                    style={{ width: `${progress.levelScores.literal}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Identificar hechos directos, personajes y lugares.</p>
              </div>

              {/* Inferencial */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-indigo-300">2. Nivel Inferencial</span>
                  <span className="text-slate-400">{progress.levelScores.inferential}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-500"
                    style={{ width: `${progress.levelScores.inferential}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Deducir causas, intenciones no explícitas y simbolismos.</p>
              </div>

              {/* Crítico */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-amber-300">3. Nivel Crítico</span>
                  <span className="text-slate-400">{progress.levelScores.critical}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-500"
                    style={{ width: `${progress.levelScores.critical}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Juzgar posturas éticas, contrastar ideas y debatir.</p>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-slate-950/60 p-3 border border-slate-800/80 text-[11px] text-slate-300 flex items-center justify-between">
            <span className="text-slate-400">Total tiempo invertido:</span>
            <span className="font-bold text-white">{progress.totalTimeMinutes} minutos</span>
          </div>
        </div>
      </div>

      {/* Quick Access to the 8 Core Study Modules */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Layers className="h-5 w-5 text-indigo-400" />
            <span>Módulos de Trabajo Rápido</span>
          </h2>
          <span className="text-xs text-slate-400">Metodología socrática orientada</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Mis PDFs */}
          <button
            onClick={() => setActiveModule('documents')}
            className="group text-left rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-indigo-500/50 hover:bg-slate-900 transition-all shadow-sm"
          >
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-110 transition-transform">
              <FileText className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors">
              Mis PDFs y Obras
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Carga tus lecturas en PDF, extrae su texto y almacénalas en tu biblioteca.
            </p>
          </button>

          {/* Card 2: Lectura Guiada */}
          <button
            onClick={() => setActiveModule('guided_reading')}
            className="group text-left rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/30 to-slate-900/80 p-5 hover:border-indigo-500 hover:bg-slate-900 transition-all shadow-sm"
          >
            <div className="h-10 w-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 mb-3 group-hover:scale-110 transition-transform">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-white group-hover:text-indigo-200 transition-colors">
              Lectura Guiada Socrática
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Diálogo pedagógico que te guía paso a paso con pistas, sin dar respuestas hechas.
            </p>
          </button>

          {/* Card 3: Generar Examen */}
          <button
            onClick={() => setActiveModule('exam')}
            className="group text-left rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-indigo-500/50 hover:bg-slate-900 transition-all shadow-sm"
          >
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-110 transition-transform">
              <HelpCircle className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
              Evaluación Formativa
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Preguntas de alternativa y desarrollo con pistas socráticas y rúbrica.
            </p>
          </button>

          {/* Card 4: Vocabulario */}
          <button
            onClick={() => setActiveModule('vocabulary')}
            className="group text-left rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-indigo-500/50 hover:bg-slate-900 transition-all shadow-sm"
          >
            <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-3 group-hover:scale-110 transition-transform">
              <BookA className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-white group-hover:text-teal-300 transition-colors">
              Deducción de Vocabulario
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Deduce palabras difíciles según el contexto antes de recibir la definición formal.
            </p>
          </button>

          {/* Card 5: Lectura en Voz Alta */}
          <button
            onClick={() => setActiveModule('read_aloud')}
            className="group text-left rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-indigo-500/50 hover:bg-slate-900 transition-all shadow-sm"
          >
            <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-3 group-hover:scale-110 transition-transform">
              <Volume2 className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-white group-hover:text-sky-300 transition-colors">
              Lectura en Voz Alta
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Reproduce el texto con voz sintetizada, ajusta la velocidad y sigue la lectura.
            </p>
          </button>

          {/* Card 6: Análisis Literario */}
          <button
            onClick={() => setActiveModule('literary_analysis')}
            className="group text-left rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-indigo-500/50 hover:bg-slate-900 transition-all shadow-sm"
          >
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3 group-hover:scale-110 transition-transform">
              <Compass className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors">
              Análisis Literario
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Explora contexto histórico, género, figuras retóricas y desafíos de debate.
            </p>
          </button>

          {/* Card 7: Fichas de Personajes */}
          <button
            onClick={() => setActiveModule('characters')}
            className="group text-left rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-indigo-500/50 hover:bg-slate-900 transition-all shadow-sm"
          >
            <div className="h-10 w-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-3 group-hover:scale-110 transition-transform">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-white group-hover:text-pink-300 transition-colors">
              Fichas de Personajes
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Registra rasgos, motivaciones, conflictos y dilemas morales de cada protagonista.
            </p>
          </button>

          {/* Card 8: Mi Progreso */}
          <button
            onClick={() => setActiveModule('progress')}
            className="group text-left rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-indigo-500/50 hover:bg-slate-900 transition-all shadow-sm"
          >
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
              <Award className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-white group-hover:text-emerald-300 transition-colors">
              Insignias y Logros
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Visualiza tus avances cognitivos, evaluaciones rendidas y destrezas alcanzadas.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};
