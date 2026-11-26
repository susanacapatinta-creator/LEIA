import React from 'react';
import {
  Home,
  FileText,
  MessageSquare,
  Volume2,
  HelpCircle,
  BookA,
  Compass,
  Users,
  TrendingUp,
  Settings,
  Sparkles,
} from 'lucide-react';
import { useApp, ActiveModule } from '../../context/AppContext';

interface SidebarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileMenuOpen, setMobileMenuOpen }) => {
  const { activeModule, setActiveModule, activeDocument, progress } = useApp();

  const navItems: {
    id: ActiveModule;
    label: string;
    sublabel: string;
    icon: React.ElementType;
    badge?: string;
  }[] = [
    {
      id: 'home',
      label: '1. Inicio',
      sublabel: 'Resumen y bienvenida',
      icon: Home,
    },
    {
      id: 'documents',
      label: '2. Mis PDFs y Textos',
      sublabel: 'Subir y explorar obras',
      icon: FileText,
      badge: 'PDF',
    },
    {
      id: 'guided_reading',
      label: '3. Lectura Guiada',
      sublabel: 'Chat socrático 3 niveles',
      icon: MessageSquare,
      badge: 'IA',
    },
    {
      id: 'read_aloud',
      label: '4. Lectura en Voz Alta',
      sublabel: 'Audio y velocidad',
      icon: Volume2,
    },
    {
      id: 'exam',
      label: '5. Generar Examen',
      sublabel: 'Opción múltiple y desarrollo',
      icon: HelpCircle,
    },
    {
      id: 'vocabulary',
      label: '6. Vocabulario',
      sublabel: 'Deducción contextual',
      icon: BookA,
    },
    {
      id: 'literary_analysis',
      label: '7. Análisis Literario',
      sublabel: 'Género, corriente y figuras',
      icon: Compass,
    },
    {
      id: 'characters',
      label: '8. Fichas de Personajes',
      sublabel: 'Rasgos, metas y conflictos',
      icon: Users,
    },
    {
      id: 'progress',
      label: '9. Mi Progreso',
      sublabel: 'Avance por niveles',
      icon: TrendingUp,
    },
    {
      id: 'settings',
      label: '10. Configuración',
      sublabel: 'Estudiante / Docente',
      icon: Settings,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/75 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-16 z-40 h-[calc(100vh-4rem)] w-64 md:w-72 shrink-0 border-r border-slate-800 bg-slate-950 p-4 transition-transform duration-200 ease-in-out overflow-y-auto ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Active Document Card inside sidebar */}
        {activeDocument && (
          <div className="mb-4 rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-slate-900 p-3 shadow-inner">
            <div className="flex items-center justify-between text-[11px] text-indigo-300 font-semibold mb-1">
              <span className="flex items-center space-x-1">
                <Sparkles className="h-3 w-3 text-cyan-400" />
                <span>Texto en Estudio</span>
              </span>
              <span className="text-[10px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
                {activeDocument.wordCount} pal.
              </span>
            </div>
            <p className="text-xs font-bold text-white line-clamp-1">{activeDocument.title}</p>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {activeDocument.author || 'Documento cargado'}
            </p>
          </div>
        )}

        {/* Modules Nav */}
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
          Módulos de Aprendizaje
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveModule(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600/30 to-indigo-700/20 text-white border border-indigo-500/40 shadow-sm'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3 text-left">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-slate-900 text-slate-400 group-hover:bg-slate-800 group-hover:text-cyan-400'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-100">{item.label}</div>
                    <div className="text-[10px] text-slate-400 leading-tight">{item.sublabel}</div>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      isActive
                        ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/30'
                        : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Socratic Pedagogy Notice */}
        <div className="mt-6 rounded-xl border border-slate-800/80 bg-slate-900/50 p-3 text-[11px] text-slate-400">
          <p className="font-semibold text-slate-200 flex items-center space-x-1.5 mb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 inline-block"></span>
            <span>Método LEIA</span>
          </p>
          <p className="text-[10px] leading-relaxed">
            LEIA no da respuestas listas para copiar; guía tu razonamiento mediante preguntas socráticas y pistas progresivas.
          </p>
        </div>
      </aside>
    </>
  );
};
