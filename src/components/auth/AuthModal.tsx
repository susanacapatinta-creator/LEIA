import React, { useState } from 'react';
import {
  UserPlus,
  LogIn,
  Sparkles,
  Mail,
  Lock,
  User,
  GraduationCap,
  X,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { loginAccount, registerAccount } from '../../services/api';
import { UserRole, EducationLevel } from '../../types';

export const AuthModal: React.FC = () => {
  const { authModalOpen, authModalReason, closeAuthModal, completeAuthSession } = useApp();

  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('estudiante');
  const [educationLevel, setEducationLevel] = useState<EducationLevel>('secundaria');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!authModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === 'register') {
        const result = await registerAccount({
          name,
          email,
          password,
          role,
          educationLevel,
        });
        completeAuthSession(result.token, result.user);
      } else {
        const result = await loginAccount({ email, password });
        completeAuthSession(result.token, result.user);
      }
      setPassword('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'No se pudo completar la autenticación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-indigo-500/35 bg-slate-900 p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 p-0.5 shadow-lg shrink-0">
              <div className="h-full w-full rounded-[10px] bg-slate-950 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-cyan-300" />
              </div>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {mode === 'register' ? 'Crear Cuenta en LEIA' : 'Iniciar Sesión en LEIA'}
              </h2>
              <p className="text-[11px] text-slate-400">
                Abierto para todos • Sin necesitar cuenta ni clave de Gemini
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeAuthModal}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
            aria-label="Cerrar ventana"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/25 p-3 text-xs text-cyan-100 flex items-start space-x-2.5">
          <ShieldCheck className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {authModalReason ||
              'Cualquier estudiante o docente puede registrarse gratis con su correo para activar el tutor socrático, exámenes con IA y voz neural.'}
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMessage(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Crear Cuenta</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Ya tengo cuenta</span>
          </button>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-200 flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nombre completo *
              </label>
              <div className="relative">
                <User className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Ana Torres"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Correo electrónico (cualquier proveedor) *
            </label>
            <div className="relative">
              <Mail className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Contraseña {mode === 'register' ? '(mínimo 6 caracteres)' : ''} *
            </label>
            <div className="relative">
              <Lock className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                minLength={6}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Perfil
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="estudiante">Estudiante</option>
                  <option value="docente">Docente</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nivel educativo
                </label>
                <select
                  value={educationLevel}
                  onChange={(e) => setEducationLevel(e.target.value as EducationLevel)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="secundaria">Secundaria</option>
                  <option value="superior">Superior / Univ.</option>
                </select>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Procesando...</span>
              </>
            ) : mode === 'register' ? (
              <>
                <UserPlus className="h-4 w-4" />
                <span>Crear Cuenta y Activar IA</span>
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                <span>Entrar y Activar IA</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export const AiAccountGateBanner: React.FC<{ moduleLabel?: string }> = ({ moduleLabel }) => {
  const { currentUser, openAuthModal } = useApp();

  if (currentUser) return null;

  return (
    <div className="rounded-2xl border border-indigo-500/40 bg-gradient-to-r from-indigo-950/70 via-slate-900 to-cyan-950/40 p-4 shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-start space-x-3">
        <div className="h-9 w-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
          <GraduationCap className="h-5 w-5 text-cyan-300" />
        </div>
        <div>
          <p className="text-xs font-bold text-white">
            Crea tu cuenta gratuita para activar la IA {moduleLabel ? `en ${moduleLabel}` : 'de LEIA'}
          </p>
          <p className="text-[11px] text-slate-300 mt-0.5">
            Cualquier persona puede registrarse con su correo (no necesitas cuenta ni clave de Gemini).
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() =>
          openAuthModal(
            `Crea tu cuenta gratuita o inicia sesión para usar la IA ${moduleLabel ? `en ${moduleLabel}` : 'de LEIA'}.`
          )
        }
        className="shrink-0 inline-flex items-center justify-center space-x-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 px-4 py-2 text-xs font-bold text-white shadow cursor-pointer"
      >
        <UserPlus className="h-3.5 w-3.5" />
        <span>Crear cuenta / Entrar</span>
      </button>
    </div>
  );
};
