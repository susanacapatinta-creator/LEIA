import React, { useState } from 'react';
import {
  Settings,
  GraduationCap,
  User,
  BookOpen,
  Volume2,
  Sliders,
  CheckCircle2,
  ShieldCheck,
  Download,
  FileText,
  Sparkles,
  Info,
  Smartphone,
  Package,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserRole, EducationLevel } from '../../types';
import { MobileInstallModal } from '../pwa/PWAInstallUI';
import { downloadAndroidApkKit } from '../../services/apkKitGenerator';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, serverHealth, exams, activeDocument } = useApp();

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [exportedText, setExportedText] = useState<string | null>(null);
  const [installModalOpen, setInstallModalOpen] = useState(false);

  const handleRoleChange = (role: UserRole) => {
    updateSettings({ role });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleEducationLevelChange = (educationLevel: EducationLevel) => {
    updateSettings({ educationLevel });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  // Teacher Tool: Export exam as printable classroom sheet
  const handleExportLatestExam = () => {
    if (exams.length === 0) {
      alert('Aún no has generado ningún examen en el módulo de evaluaciones.');
      return;
    }
    const latest = exams[0];
    let sheet = `==========================================================\n`;
    sheet += `INSTITUCIÓN EDUCATIVA / EVALUACIÓN DE COMPRENSIÓN LECTORA\n`;
    sheet += `TÍTULO DE LA EVALUACIÓN: ${latest.title}\n`;
    sheet += `DOCUMENTO DE BASE: ${latest.documentTitle}\n`;
    sheet += `FECHA: ${new Date().toLocaleDateString()}\n`;
    sheet += `ESTUDIANTE: ____________________________________ SECCIÓN: ____\n`;
    sheet += `==========================================================\n\n`;
    sheet += `INSTRUCCIONES: ${latest.instructions}\n\n`;

    latest.questions.forEach((q, idx) => {
      sheet += `[Pregunta ${idx + 1}] (Nivel: ${q.level.toUpperCase()})\n`;
      sheet += `${q.prompt}\n`;
      if (q.type === 'multiple_choice' && q.options) {
        q.options.forEach((opt, oIdx) => {
          sheet += `   ${String.fromCharCode(65 + oIdx)}) ${opt}\n`;
        });
      } else {
        sheet += `   R: __________________________________________________\n`;
        sheet += `      __________________________________________________\n`;
        if (q.rubricCriteria) {
          sheet += `   [Rúbrica docente: ${q.rubricCriteria}]\n`;
        }
      }
      sheet += `\n`;
    });

    setExportedText(sheet);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
            <Settings className="h-6 w-6 text-indigo-400" />
            <span>Configuración y Perfiles de Usuario</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Personaliza el comportamiento socrático, la tipografía y alterna entre el rol de Estudiante y Docente.
          </p>
        </div>

        {savedSuccess && (
          <span className="inline-flex items-center space-x-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-xl animate-in fade-in">
            <CheckCircle2 className="h-4 w-4" />
            <span>Guardado automáticamente</span>
          </span>
        )}
      </div>

      {/* Role Selection Tabs */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-6">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <GraduationCap className="h-5 w-5 text-indigo-400" />
            <span>Perfil de Acceso</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Selecciona si utilizas LEIA para tu aprendizaje autónomo o para diseñar materiales didácticos como docente
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Estudiante */}
          <button
            type="button"
            onClick={() => handleRoleChange('estudiante')}
            className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
              settings.role === 'estudiante'
                ? 'border-indigo-500 bg-indigo-950/30 shadow-lg ring-1 ring-indigo-500/40'
                : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-white flex items-center space-x-2">
                <User className="h-4 w-4 text-cyan-400" />
                <span>Modo Estudiante</span>
              </span>
              {settings.role === 'estudiante' && (
                <span className="text-xs text-indigo-300 font-semibold bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/30">
                  Activo
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enfocado en la lectura socrática guiada, andamiaje progresivo, resolución formativa de exámenes y deducción de vocabulario.
            </p>
          </button>

          {/* Docente */}
          <button
            type="button"
            onClick={() => handleRoleChange('docente')}
            className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
              settings.role === 'docente'
                ? 'border-indigo-500 bg-indigo-950/30 shadow-lg ring-1 ring-indigo-500/40'
                : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-white flex items-center space-x-2">
                <GraduationCap className="h-4 w-4 text-amber-400" />
                <span>Modo Docente / Profesor</span>
              </span>
              {settings.role === 'docente' && (
                <span className="text-xs text-amber-300 font-semibold bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                  Activo
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Habilita herramientas de exportación de exámenes con rúbricas de corrección, diseño de debates en clase y supervisión de los 3 niveles de comprensión.
            </p>
          </button>
        </div>

        {/* User name & Education level */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nombre o alias en LEIA
            </label>
            <input
              type="text"
              value={settings.userName}
              onChange={(e) => updateSettings({ userName: e.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Etapa Educativa Objetivo
            </label>
            <select
              value={settings.educationLevel}
              onChange={(e) => handleEducationLevelChange(e.target.value as EducationLevel)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="secundaria">Educación Secundaria (12 - 17 años)</option>
              <option value="superior">Educación Superior / Universitaria (18+ años)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Teacher-Exclusive Tools (visible if docente) */}
      {settings.role === 'docente' && (
        <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-900 p-6 shadow-xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
              <Sparkles className="h-4 w-4" />
              <span>Herramientas para Docentes</span>
            </span>
            <span className="text-xs text-slate-400">Material didáctico para el aula</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-sm">
                Exportar Examen de Aula con Rúbrica de Corrección
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Convierte la última evaluación generada en una hoja lista para imprimir o fotocopiar para tus alumnos.
              </p>
            </div>
            <button
              onClick={handleExportLatestExam}
              className="inline-flex items-center space-x-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs px-4 py-2.5 shadow transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Generar Hoja Imprimible</span>
            </button>
          </div>

          {exportedText && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Hoja generada lista para copiar o guardar:</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(exportedText);
                    alert('¡Hoja de examen copiada al portapapeles!');
                  }}
                  className="text-amber-400 hover:underline font-semibold"
                >
                  Copiar texto completo
                </button>
              </div>
              <textarea
                readOnly
                rows={8}
                value={exportedText}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200 font-mono"
              />
            </div>
          )}
        </div>
      )}

      {/* Reader & Typographic Preferences */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-5">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <BookOpen className="h-5 w-5 text-cyan-400" />
            <span>Preferencias Visuales y de Lectura</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Ajusta la presentación de los textos para mayor confort visual y ergonomía
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tipografía por defecto para lectura
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateSettings({ readingFont: 'serif' })}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  settings.readingFont === 'serif'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-950 text-slate-400 border border-slate-800'
                }`}
              >
                Serif Clásica (Lora)
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ readingFont: 'sans' })}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  settings.readingFont === 'sans'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-950 text-slate-400 border border-slate-800'
                }`}
              >
                Sans Moderna (Jakarta)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tamaño de letra predeterminado
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['base', 'lg', 'xl'] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => updateSettings({ fontSize: sz })}
                  className={`py-2 rounded-xl text-xs font-bold transition-all uppercase ${
                    settings.fontSize === sz
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}
                >
                  {sz === 'base' ? 'Estándar' : sz === 'lg' ? 'Grande' : 'Muy Grande'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Installation & Android APK Kit */}
      <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 via-slate-900 to-slate-900 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Smartphone className="h-5 w-5 text-cyan-400" />
              <span>Aplicación Móvil (PWA) y Kit Android (.APK)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Instala LEIA directamente en Android o iPhone como app independiente, o descarga el paquete de configuración para compilar el archivo .apk.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setInstallModalOpen(true)}
              className="inline-flex items-center space-x-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-4 py-2.5 shadow cursor-pointer"
            >
              <Smartphone className="h-4 w-4" />
              <span>Instalar / Ver Opciones</span>
            </button>
            <button
              type="button"
              onClick={() => downloadAndroidApkKit(window.location.origin)}
              className="inline-flex items-center space-x-2 rounded-xl border border-indigo-500/40 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-200 font-bold text-xs px-4 py-2.5 cursor-pointer"
            >
              <Package className="h-4 w-4" />
              <span>Descargar Kit APK (.zip)</span>
            </button>
          </div>
        </div>
      </div>

      {/* System Technical Diagnostic Info */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl text-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="font-bold text-white flex items-center space-x-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Diagnóstico de Servicios y Seguridad</span>
          </span>
          <span className="text-[11px] text-slate-400">Arquitectura Full-Stack + PWA</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300 text-[11px]">
          <div>
            <span className="text-slate-500 font-semibold">Motor de IA:</span>{' '}
            <span className="text-indigo-300 font-mono">{serverHealth?.model || 'gemini-3.1-flash-lite'}</span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold">Almacenamiento de Libros:</span>{' '}
            <span className="text-emerald-400">IndexedDB local (+1,000 páginas)</span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold">Generador de Exámenes:</span>{' '}
            <span className="text-cyan-300">Hasta 80 preguntas por lotes</span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold">Síntesis de Voz:</span>{' '}
            <span className="text-teal-300">Voz Natural Gemini TTS + Web Speech</span>
          </div>
        </div>
      </div>

      <MobileInstallModal open={installModalOpen} onClose={() => setInstallModalOpen(false)} />
    </div>
  );
};
