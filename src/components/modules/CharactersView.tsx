import React, { useState } from 'react';
import {
  Users,
  Sparkles,
  Plus,
  Trash2,
  Quote,
  Shield,
  Heart,
  Target,
  Swords,
  TrendingUp,
  Loader2,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CharacterProfile } from '../../types';
import { requestCharacterAnalysis } from '../../services/api';
import { AiAccountGateBanner } from '../auth/AuthModal';

export const CharactersView: React.FC = () => {
  const {
    activeDocument,
    characterDossiers,
    saveCharacterDossiers,
    setActiveModule,
    currentUser,
    openAuthModal,
  } = useApp();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New character manual form
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('Protagonista');
  const [newTraits, setNewTraits] = useState('');
  const [newMotivations, setNewMotivations] = useState('');
  const [newConflicts, setNewConflicts] = useState('');
  const [newRelationships, setNewRelationships] = useState('');
  const [newArc, setNewArc] = useState('');
  const [newQuote, setNewQuote] = useState('');
  const [newDilemma, setNewDilemma] = useState('');

  const docId = activeDocument?.id || 'default';
  const characters = characterDossiers[docId] || [];

  const handleGenerateCharacters = async () => {
    if (!activeDocument) return;

    if (!currentUser) {
      openAuthModal('Crea tu cuenta gratuita o inicia sesión para analizar personajes con IA.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await requestCharacterAnalysis({
        documentTitle: activeDocument.title,
        documentText: activeDocument.content,
      });

      saveCharacterDossiers(activeDocument.id, res.characters);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err?.message || 'No se pudieron extraer los personajes con IA. Revisa la conexión con el servidor.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddManualCharacter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const char: CharacterProfile = {
      id: `char-man-${Date.now()}`,
      documentId: activeDocument?.id || 'doc',
      name: newName.trim(),
      role: newRole,
      physicalAndPsychologicalTraits: newTraits.trim(),
      motivations: newMotivations.trim(),
      conflicts: newConflicts.trim(),
      relationships: newRelationships.trim(),
      arcEvolution: newArc.trim(),
      keyQuote: newQuote.trim(),
      socraticDilemma: newDilemma.trim(),
    };

    saveCharacterDossiers(docId, [...characters, char]);
    setShowAddModal(false);
    // Reset form
    setNewName('');
    setNewTraits('');
    setNewMotivations('');
    setNewConflicts('');
    setNewRelationships('');
    setNewArc('');
    setNewQuote('');
    setNewDilemma('');
  };

  const handleDeleteCharacter = (charId: string) => {
    const updated = characters.filter((c) => c.id !== charId);
    saveCharacterDossiers(docId, updated);
  };

  if (!activeDocument) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center max-w-xl mx-auto my-12">
        <Users className="h-12 w-12 text-pink-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white">No hay documento activo</h2>
        <p className="text-xs text-slate-400 mt-2">
          Selecciona una obra de la biblioteca o sube un documento PDF para construir y analizar las fichas de personajes.
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
            <Users className="h-6 w-6 text-pink-400" />
            <span>Fichas de Personajes y Arcos Psicológicos</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Explora las dimensiones humanas, motivaciones ocultas y dilemas éticos de los personajes en "{activeDocument.title}".
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4 text-pink-400" />
            <span>Ficha Manual</span>
          </button>

          <button
            onClick={handleGenerateCharacters}
            disabled={isLoading}
            className="inline-flex items-center space-x-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white px-5 py-2 font-bold text-xs shadow-lg shadow-pink-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Extrayendo perfiles...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-cyan-300" />
                <span>Analizar Personajes con IA</span>
              </>
            )}
          </button>
        </div>
      </div>

      <AiAccountGateBanner moduleLabel="Fichas de Personajes" />

      {errorMessage && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-xs text-rose-200 flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Manual Creation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleAddManualCharacter}
            className="relative w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Registrar Nueva Ficha de Personaje</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre del personaje *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej. Don Quijote, Alicia, Jordán..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Rol narrativo</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
                >
                  <option value="Protagonista">Protagonista</option>
                  <option value="Antagonista">Antagonista</option>
                  <option value="Secundario">Secundario</option>
                  <option value="Testigo / Narrador">Testigo / Narrador</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Rasgos físicos y psicológicos</label>
              <textarea
                rows={2}
                value={newTraits}
                onChange={(e) => setNewTraits(e.target.value)}
                placeholder="Descripción física, temperamento, debilidades y virtudes..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-white focus:outline-none focus:border-pink-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Motivaciones y Objetivos</label>
                <input
                  type="text"
                  value={newMotivations}
                  onChange={(e) => setNewMotivations(e.target.value)}
                  placeholder="¿Qué desea alcanzar?"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Conflictos que enfrenta</label>
                <input
                  type="text"
                  value={newConflicts}
                  onChange={(e) => setNewConflicts(e.target.value)}
                  placeholder="Internos (duda, culpa) o externos"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Cita textual representativa</label>
              <input
                type="text"
                value={newQuote}
                onChange={(e) => setNewQuote(e.target.value)}
                placeholder="Pega una frase dicha por el personaje o sobre él..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 font-bold text-xs text-white shadow-md cursor-pointer"
              >
                Guardar Ficha
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Characters Cards Grid */}
      {characters.length === 0 && !isLoading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mx-auto">
            <Users className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-white">No hay fichas de personajes registradas</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Puedes hacer clic en "Analizar Personajes con IA" para que LEIA identifique automáticamente a los personajes de "{activeDocument.title}" con sus dimensiones psicológicas, o registrar una ficha manualmente.
          </p>
          <button
            onClick={handleGenerateCharacters}
            className="px-6 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs shadow-md"
          >
            Extraer Personajes con LEIA
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {characters.map((char) => (
            <div
              key={char.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl flex flex-col justify-between space-y-4 hover:border-pink-500/40 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-block rounded-md bg-pink-500/20 border border-pink-500/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pink-300 mb-1.5">
                      {char.role}
                    </span>
                    <h3 className="text-lg font-bold text-white">{char.name}</h3>
                  </div>

                  <button
                    onClick={() => handleDeleteCharacter(char.id)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                    title="Eliminar personaje"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Traits */}
                {char.physicalAndPsychologicalTraits && (
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {char.physicalAndPsychologicalTraits}
                  </p>
                )}

                {/* Motivations & Conflicts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-xs">
                  {char.motivations && (
                    <div className="rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/60">
                      <span className="font-semibold text-cyan-400 flex items-center space-x-1 mb-1">
                        <Target className="h-3 w-3" />
                        <span>Motivaciones:</span>
                      </span>
                      <p className="text-slate-300 text-[11px] leading-snug">{char.motivations}</p>
                    </div>
                  )}

                  {char.conflicts && (
                    <div className="rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/60">
                      <span className="font-semibold text-rose-400 flex items-center space-x-1 mb-1">
                        <Swords className="h-3 w-3" />
                        <span>Conflictos:</span>
                      </span>
                      <p className="text-slate-300 text-[11px] leading-snug">{char.conflicts}</p>
                    </div>
                  )}
                </div>

                {/* Arc & Relationships */}
                {(char.relationships || char.arcEvolution) && (
                  <div className="mt-3 text-xs space-y-1.5">
                    {char.relationships && (
                      <p className="text-slate-400 text-[11px]">
                        <span className="font-semibold text-slate-300">Vínculos:</span> {char.relationships}
                      </p>
                    )}
                    {char.arcEvolution && (
                      <p className="text-slate-400 text-[11px]">
                        <span className="font-semibold text-indigo-300">Evolución:</span> {char.arcEvolution}
                      </p>
                    )}
                  </div>
                )}

                {/* Quote */}
                {char.keyQuote && (
                  <blockquote className="mt-3 rounded-lg bg-slate-950 p-2.5 text-xs text-pink-200 italic font-serif-reading border-l-2 border-pink-400">
                    <Quote className="h-3 w-3 inline mr-1 text-pink-400" />
                    "{char.keyQuote}"
                  </blockquote>
                )}
              </div>

              {/* Socratic Dilemma */}
              {char.socraticDilemma && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-200">
                  <span className="font-bold flex items-center space-x-1 mb-1">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                    <span>Dilema Ético para Juzgar:</span>
                  </span>
                  <p className="text-[11px] leading-relaxed">{char.socraticDilemma}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
