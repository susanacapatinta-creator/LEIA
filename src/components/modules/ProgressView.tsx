import React from 'react';
import {
  TrendingUp,
  Award,
  BookOpen,
  HelpCircle,
  BookA,
  Clock,
  Sparkles,
  CheckCircle2,
  Brain,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ProgressView: React.FC = () => {
  const { progress, exams, vocabularyList, documents, settings } = useApp();

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
          <TrendingUp className="h-6 w-6 text-emerald-400" />
          <span>Mi Progreso y Madurez Lectora</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Seguimiento pedagógico diferenciado por niveles de comprensión: Literal, Inferencial y Crítico.
        </p>
      </div>

      {/* Top 4 Stat Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Texts */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Obras Leídas</span>
            <FileText className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {progress.totalTextsRead}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{documents.length} disponibles en biblioteca</p>
        </div>

        {/* Time */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Tiempo Invertido</span>
            <Clock className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {progress.totalTimeMinutes} <span className="text-sm font-normal text-slate-400">min</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Lectura reflexiva y activa</p>
        </div>

        {/* Exams */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Evaluaciones</span>
            <HelpCircle className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {progress.examsTaken}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Promedio: {progress.averageExamScore}%</p>
        </div>

        {/* Vocabulary */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Léxico Deducido</span>
            <BookA className="h-4 w-4 text-teal-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {vocabularyList.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {vocabularyList.filter((v) => v.mastered).length} dominadas
          </p>
        </div>
      </div>

      {/* Comprehension Level Breakdown */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Brain className="h-5 w-5 text-indigo-400" />
              <span>Avance por Dimensiones Cognitivas</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tu madurez lectora evoluciona desde la localización precisa de datos hasta la argumentación autónoma
            </p>
          </div>
          <span className="text-xs text-indigo-300 font-semibold bg-indigo-500/15 border border-indigo-500/30 px-3 py-1 rounded-full">
            Perfil: {settings.educationLevel === 'secundaria' ? 'Secundaria' : 'Educación Superior'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Level 1: Literal */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/15 p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Nivel 1: Literal
                </span>
                <span className="text-lg font-black text-white">{progress.levelScores.literal}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                  style={{ width: `${progress.levelScores.literal}%` }}
                />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Capacidad de ubicar datos explícitos, secuencias temporales, nombres propios y descripciones directas en el texto sin tergiversar la información.
              </p>
            </div>

            <div className="pt-3 border-t border-emerald-500/20 text-[11px] text-emerald-300">
              ✓ {progress.literalInteractions} consultas literales realizadas
            </div>
          </div>

          {/* Level 2: Inferencial */}
          <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/15 p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  Nivel 2: Inferencial
                </span>
                <span className="text-lg font-black text-white">{progress.levelScores.inferential}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                  style={{ width: `${progress.levelScores.inferential}%` }}
                />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Habilidad para leer entre líneas: deducir intenciones del autor, causas implícitas, metáforas, presagios y la psicología subyacente de los personajes.
              </p>
            </div>

            <div className="pt-3 border-t border-indigo-500/20 text-[11px] text-indigo-300">
              ✓ {progress.inferentialInteractions} deducciones inferenciales guiadas
            </div>
          </div>

          {/* Level 3: Crítico */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/15 p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Nivel 3: Crítico
                </span>
                <span className="text-lg font-black text-white">{progress.levelScores.critical}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full"
                  style={{ width: `${progress.levelScores.critical}%` }}
                />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Cúspide de la autonomía epistémica: capacidad de emitir juicios de valor, contrastar con la realidad contemporánea y sostener contrapreguntas con citas sólidas.
              </p>
            </div>

            <div className="pt-3 border-t border-amber-500/20 text-[11px] text-amber-300">
              ✓ {progress.criticalInteractions} argumentos críticos sustentados
            </div>
          </div>
        </div>
      </div>

      {/* Achievements and Badges */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Award className="h-5 w-5 text-amber-400" />
            <span>Insignias de Pensamiento y Aprendizaje Autónomo</span>
          </h2>
          <span className="text-xs text-slate-400">Hitos formativos logrados</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {progress.achievements.map((badge) => (
            <div
              key={badge.id}
              className={`rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                badge.unlocked
                  ? 'border-indigo-500/40 bg-gradient-to-br from-indigo-950/30 to-slate-900 shadow-md'
                  : 'border-slate-800 bg-slate-950/40 opacity-50'
              }`}
            >
              <div>
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3 ${
                    badge.unlocked
                      ? 'bg-indigo-600/20 border border-indigo-500/40 text-cyan-300'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  <Award className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-xs text-white">{badge.title}</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  {badge.description}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] font-semibold">
                {badge.unlocked ? (
                  <span className="text-emerald-400 flex items-center space-x-1">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Desbloqueada</span>
                  </span>
                ) : (
                  <span className="text-slate-500">En progreso...</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
