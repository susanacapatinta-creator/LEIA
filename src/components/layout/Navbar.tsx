import React from 'react';
import {
  BookOpen,
  Sparkles,
  ChevronDown,
  Volume2,
  Menu,
  X,
  GraduationCap,
  FileText,
  ShieldCheck,
  AlertCircle,
  UserPlus,
  LogOut,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ComprehensionLevel } from '../../types';
import { PWAInstallButton } from '../pwa/PWAInstallUI';

interface NavbarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ mobileMenuOpen, setMobileMenuOpen }) => {
  const {
    documents,
    activeDocument,
    setActiveDocument,
    activeLevel,
    setActiveLevel,
    settings,
    serverHealth,
    setActiveModule,
    currentUser,
    openAuthModal,
    logout,
  } = useApp();

  const [docDropdownOpen, setDocDropdownOpen] = React.useState(false);
  const [levelDropdownOpen, setLevelDropdownOpen] = React.useState(false);

  const levelLabels: Record<ComprehensionLevel, { name: string; color: string; desc: string }> = {
    literal: {
      name: 'Nivel Literal',
      color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      desc: 'Información explícita y hechos directos',
    },
    inferential: {
      name: 'Nivel Inferencial',
      color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
      desc: 'Deducciones, causas y significados implícitos',
    },
    critical: {
      name: 'Nivel Crítico',
      color: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      desc: 'Argumentos, posturas éticas y contrapreguntas',
    },
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Mobile hamburger + Logo */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <button
            onClick={() => setActiveModule('home')}
            className="flex items-center space-x-2 text-left group transition-all"
          >
            <img
              src="/pwa-192x192.png"
              alt="Logo LEIA"
              referrerPolicy="no-referrer"
              className="h-10 w-10 rounded-xl border border-[#71899D]/40 shadow-lg shadow-indigo-500/20 object-cover group-hover:scale-105 transition-transform shrink-0"
            />
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold tracking-tight text-white text-lg">LEIA</span>
                <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 border border-cyan-500/30">
                  Educativa
                </span>
              </div>
              <p className="hidden text-[11px] text-slate-400 sm:block leading-none">
                Lectora Educativa Inteligente Asistida
              </p>
            </div>
          </button>
        </div>

        {/* Center: Document selector */}
        <div className="relative hidden md:block">
          <button
            onClick={() => setDocDropdownOpen(!docDropdownOpen)}
            className="flex items-center space-x-2 rounded-xl border border-slate-800 bg-slate-900/90 px-3.5 py-1.5 text-xs text-slate-200 hover:border-slate-700 hover:bg-slate-800/80 transition-all max-w-[280px] lg:max-w-[360px]"
          >
            <FileText className="h-4 w-4 text-cyan-400 shrink-0" />
            <span className="truncate font-medium">
              {activeDocument ? activeDocument.title : 'Seleccionar Documento'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          </button>

          {docDropdownOpen && (
            <div
              className="absolute left-0 mt-2 w-80 rounded-xl border border-slate-800 bg-slate-900 p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2"
              onMouseLeave={() => setDocDropdownOpen(false)}
            >
              <div className="flex items-center justify-between px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800/80">
                <span>Textos disponibles ({documents.length})</span>
                <button
                  onClick={() => {
                    setDocDropdownOpen(false);
                    setActiveModule('documents');
                  }}
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  Subir PDF +
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto mt-1 space-y-1">
                {documents.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => {
                      setActiveDocument(doc);
                      setDocDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex flex-col ${
                      activeDocument?.id === doc.id
                        ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/30'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="font-medium truncate">{doc.title}</span>
                    <span className="text-[10px] text-slate-400">
                      {doc.author || 'Documento PDF'} • {doc.wordCount} palabras
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Level selector & Profile status */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Level Switcher */}
          <div className="relative">
            <button
              onClick={() => setLevelDropdownOpen(!levelDropdownOpen)}
              className={`flex items-center space-x-1.5 rounded-xl border px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-all ${
                levelLabels[activeLevel].color
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">{levelLabels[activeLevel].name}</span>
              <span className="sm:hidden capitalize">{activeLevel}</span>
              <ChevronDown className="h-3 w-3 opacity-70" />
            </button>

            {levelDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-800 bg-slate-900 p-2 shadow-2xl z-50"
                onMouseLeave={() => setLevelDropdownOpen(false)}
              >
                <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Nivel de Comprensión
                </div>
                {(['literal', 'inferential', 'critical'] as ComprehensionLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => {
                      setActiveLevel(lvl);
                      setLevelDropdownOpen(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg text-xs transition-all my-0.5 ${
                      activeLevel === lvl
                        ? 'bg-indigo-600/30 border border-indigo-500/40 text-white'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-semibold capitalize text-indigo-300">{levelLabels[lvl].name}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{levelLabels[lvl].desc}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* AI Connection status pill */}
          <div
            title={
              serverHealth?.hasApiKey
                ? 'IA Gemini conectada y lista para tutoría socrática'
                : 'Modo seguro local: servidor activo, Gemini en espera de clave'
            }
            className="hidden lg:flex items-center space-x-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-[11px] text-slate-300"
          >
            {serverHealth?.hasApiKey ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-400 font-medium">IA Lista</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-cyan-400"></span>
                <span className="text-cyan-300 font-medium">LEIA Activa</span>
              </>
            )}
          </div>

          {/* Mobile App / Android APK Kit Button */}
          <PWAInstallButton />

          {/* User Account / Auth Button */}
          {currentUser ? (
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setActiveModule('settings')}
                title={`Conectado como ${currentUser.email}`}
                className="flex items-center space-x-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/15 px-2.5 py-1.5 text-xs text-indigo-200 hover:bg-indigo-500/25 transition-colors cursor-pointer"
              >
                <GraduationCap className="h-4 w-4 text-cyan-300" />
                <span className="hidden sm:inline font-semibold max-w-[110px] truncate">
                  {currentUser.name}
                </span>
              </button>
              <button
                type="button"
                onClick={() => logout()}
                title="Cerrar sesión"
                className="rounded-xl border border-slate-800 bg-slate-900 p-1.5 text-slate-400 hover:bg-rose-950/50 hover:text-rose-300 transition-colors cursor-pointer"
                aria-label="Cerrar sesión"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal()}
              className="flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 px-3 py-1.5 text-xs font-bold text-white shadow cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5 shrink-0" />
              <span>Crear cuenta</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
