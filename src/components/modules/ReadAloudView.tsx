import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Play,
  Pause,
  Square,
  FastForward,
  Rewind,
  Sliders,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  VolumeX,
  Heart,
  Loader2,
  Feather,
  Wand2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { requestNeuralTTS } from '../../services/api';
import { AiAccountGateBanner } from '../auth/AuthModal';

type VoiceEngine = 'neural' | 'browser';

interface VoicePersona {
  id: string;
  name: string;
  description: string;
  tone: string;
  geminiVoice: 'Kore' | 'Zephyr' | 'Puck' | 'Fenrir';
  defaultRate: number;
  defaultPitch: number;
  stylePrompt: string;
}

const VOICE_PERSONAS: VoicePersona[] = [
  {
    id: 'kore-calm',
    name: 'Kore (Voz Dulce y Serena)',
    description: 'Voz femenina muy suave, pausada y relajante. Ideal para concentración.',
    tone: 'Tranquila, delicada y empática',
    geminiVoice: 'Kore',
    defaultRate: 0.9,
    defaultPitch: 0.95,
    stylePrompt: 'Voz femenina extraordinariamente suave, dulce, pausada, tranquila y relajante para lectura educativa en español.',
  },
  {
    id: 'zephyr-soft',
    name: 'Zephyr (Voz Serena y Cálida)',
    description: 'Voz pausada, armónica y contemplativa. Excelente para narraciones profundas.',
    tone: 'Cálida, íntima y reposada',
    geminiVoice: 'Zephyr',
    defaultRate: 0.85,
    defaultPitch: 0.9,
    stylePrompt: 'Voz suave, cálida, reposada, serena y contemplativa con cadencia pausada en español.',
  },
  {
    id: 'puck-narrator',
    name: 'Puck (Narrador Reflexivo)',
    description: 'Voz masculina reflexiva, agradable y sin estridencias.',
    tone: 'Clara, sosegada y amable',
    geminiVoice: 'Puck',
    defaultRate: 0.9,
    defaultPitch: 0.9,
    stylePrompt: 'Voz masculina muy tranquila, clara, suave, comprensiva y pausada en español.',
  },
  {
    id: 'fenrir-deep',
    name: 'Fenrir (Voz Grave y Apacible)',
    description: 'Voz masculina profunda, reposada y apacible para una lectura solemne.',
    tone: 'Profunda, serena y reposada',
    geminiVoice: 'Fenrir',
    defaultRate: 0.85,
    defaultPitch: 0.85,
    stylePrompt: 'Voz masculina profunda, suave, solemne, muy tranquila y sin prisas en español.',
  },
];

export const ReadAloudView: React.FC = () => {
  const { activeDocument, setActiveModule, serverHealth, currentUser, openAuthModal } = useApp();

  // Voice Engine: default to neural (Gemini TTS) when available for high quality, with browser fallback
  const [engine, setEngine] = useState<VoiceEngine>('neural');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('kore-calm');

  // Controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [speechRate, setSpeechRate] = useState(0.9); // Calm default (0.9x)
  const [speechPitch, setSpeechPitch] = useState(0.95); // Softer default
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Browser voices
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedBrowserVoiceURI, setSelectedBrowserVoiceURI] = useState<string>('');

  // Audio elements
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const cachedAudioUrlsRef = useRef<Map<string, string>>(new Map());

  // Split active document into readable paragraphs (safely bounded chunks for 1000+ page books)
  const paragraphs = React.useMemo(() => {
    if (!activeDocument?.content) return [];
    const raw = activeDocument.content
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    // Split oversized single-block PDF pages into ~900-char readable chunks for TTS
    const normalized: string[] = [];
    for (const block of raw) {
      if (block.length <= 1000) {
        normalized.push(block);
      } else {
        const sentences = block.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [block];
        let buf = '';
        for (const s of sentences) {
          if (buf.length + s.length > 900 && buf.length > 0) {
            normalized.push(buf.trim());
            buf = s;
          } else {
            buf += s;
          }
        }
        if (buf.trim()) normalized.push(buf.trim());
      }
    }
    return normalized;
  }, [activeDocument]);

  const PARAGRAPHS_PER_PAGE = 20;
  const totalParagraphPages = Math.max(1, Math.ceil(paragraphs.length / PARAGRAPHS_PER_PAGE));
  const [visiblePage, setVisiblePage] = useState(0);

  useEffect(() => {
    setVisiblePage(0);
    setCurrentParagraphIndex(0);
  }, [activeDocument?.id]);

  // Keep visiblePage synced when playback advances across pages
  useEffect(() => {
    const targetPage = Math.floor(currentParagraphIndex / PARAGRAPHS_PER_PAGE);
    if (targetPage !== visiblePage) {
      setVisiblePage(targetPage);
    }
  }, [currentParagraphIndex]);

  const visibleParagraphs = paragraphs.slice(
    visiblePage * PARAGRAPHS_PER_PAGE,
    (visiblePage + 1) * PARAGRAPHS_PER_PAGE
  );

  const currentPersona = VOICE_PERSONAS.find((p) => p.id === selectedPersonaId) || VOICE_PERSONAS[0];

  // Initialize browser voices and audio element
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!audioElementRef.current) {
      audioElementRef.current = new Audio();
    }

    const audioEl = audioElementRef.current;

    const handleEnded = () => {
      // Advance to next paragraph smoothly
      setCurrentParagraphIndex((prev) => {
        const next = prev + 1;
        if (next < paragraphs.length) {
          playParagraphWithCurrentEngine(next);
          return next;
        } else {
          setIsPlaying(false);
          setIsPaused(false);
          return 0;
        }
      });
    };

    const handleError = (e: Event) => {
      console.warn('Audio element error, falling back to browser speech:', e);
      setIsLoadingAudio(false);
      // Fallback to browser speech if audio element fails
      speakWithBrowserTTS(currentParagraphIndex);
    };

    audioEl.addEventListener('ended', handleEnded);
    audioEl.addEventListener('error', handleError);

    // Browser speech synthesis setup
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const avail = window.speechSynthesis.getVoices();
        setBrowserVoices(avail);
        // Find calmest/natural Spanish voice
        const naturalEs = avail.find(
          (v) =>
            (v.lang.startsWith('es') || v.lang.includes('Spanish')) &&
            (v.name.toLowerCase().includes('natural') ||
              v.name.toLowerCase().includes('google') ||
              v.name.toLowerCase().includes('sabina') ||
              v.name.toLowerCase().includes('helena') ||
              v.name.toLowerCase().includes('elena') ||
              v.name.toLowerCase().includes('monica'))
        );
        const anyEs = avail.find((v) => v.lang.startsWith('es') || v.lang.includes('Spanish'));
        if (naturalEs) {
          setSelectedBrowserVoiceURI(naturalEs.voiceURI);
        } else if (anyEs) {
          setSelectedBrowserVoiceURI(anyEs.voiceURI);
        } else if (avail.length > 0) {
          setSelectedBrowserVoiceURI(avail[0].voiceURI);
        }
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      audioEl.removeEventListener('ended', handleEnded);
      audioEl.removeEventListener('error', handleError);
      audioEl.pause();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [paragraphs]);

  // Update speed of currently playing audio immediately
  useEffect(() => {
    if (audioElementRef.current) {
      audioElementRef.current.playbackRate = speechRate;
    }
  }, [speechRate]);

  // When changing persona, adopt its tuned calming pitch/rate
  const applyPersona = (persona: VoicePersona) => {
    setSelectedPersonaId(persona.id);
    setSpeechRate(persona.defaultRate);
    setSpeechPitch(persona.defaultPitch);

    if (isPlaying) {
      // Re-trigger with new persona
      stopAll();
      setTimeout(() => {
        playParagraph(currentParagraphIndex, persona.id, persona.defaultRate, persona.defaultPitch);
      }, 100);
    }
  };

  const stopAll = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
    setIsLoadingAudio(false);
  };

  const speakWithBrowserTTS = (index: number, customRate = speechRate, customPitch = speechPitch) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    if (index < 0 || index >= paragraphs.length) {
      setIsPlaying(false);
      setIsPaused(false);
      return;
    }

    const textToSpeak = paragraphs[index];
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = customRate;
    utterance.pitch = customPitch;

    const selectedVoice = browserVoices.find((v) => v.voiceURI === selectedBrowserVoiceURI);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
      setIsLoadingAudio(false);
      setCurrentParagraphIndex(index);
    };

    utterance.onend = () => {
      if (index + 1 < paragraphs.length) {
        speakWithBrowserTTS(index + 1, customRate, customPitch);
      } else {
        setIsPlaying(false);
        setIsPaused(false);
      }
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setIsLoadingAudio(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const playParagraph = async (
    index: number,
    personaId = selectedPersonaId,
    targetRate = speechRate,
    targetPitch = speechPitch
  ) => {
    if (index < 0 || index >= paragraphs.length) {
      stopAll();
      return;
    }

    setCurrentParagraphIndex(index);

    if (engine === 'browser') {
      speakWithBrowserTTS(index, targetRate, targetPitch);
      return;
    }

    if (!currentUser) {
      openAuthModal('Crea tu cuenta gratuita o inicia sesión para escuchar con la Voz Neural HD, o cambia a Voz Local Navegador.');
      return;
    }

    // Neural Engine (Gemini TTS)
    const persona = VOICE_PERSONAS.find((p) => p.id === personaId) || currentPersona;
    const cacheKey = `${persona.id}_${index}_${paragraphs[index].slice(0, 40)}`;

    stopAll();
    setIsLoadingAudio(true);
    setStatusMessage('Generando voz neural tranquila y natural...');

    try {
      let audioUrl = cachedAudioUrlsRef.current.get(cacheKey);

      if (!audioUrl) {
        const res = await requestNeuralTTS({
          text: paragraphs[index],
          voiceName: persona.geminiVoice,
          style: `${persona.stylePrompt} Habla de forma muy suave, pausada, tranquila y acogedora.`,
        });
        audioUrl = res.audio;
        cachedAudioUrlsRef.current.set(cacheKey, audioUrl);
      }

      if (audioElementRef.current) {
        audioElementRef.current.src = audioUrl;
        audioElementRef.current.playbackRate = targetRate;
        await audioElementRef.current.play();
        setIsPlaying(true);
        setIsPaused(false);
        setStatusMessage(null);
      }
    } catch (err: any) {
      console.warn('Error con voz neural, alternando automáticamente a voz local:', err);
      setStatusMessage('Usando voz local calmada como respaldo.');
      speakWithBrowserTTS(index, targetRate, targetPitch);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const playParagraphWithCurrentEngine = (index: number) => {
    playParagraph(index, selectedPersonaId, speechRate, speechPitch);
  };

  const handlePlayToggle = () => {
    if (isPlaying) {
      if (engine === 'neural' && audioElementRef.current) {
        audioElementRef.current.pause();
      } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.pause();
      }
      setIsPlaying(false);
      setIsPaused(true);
    } else if (isPaused) {
      if (engine === 'neural' && audioElementRef.current) {
        audioElementRef.current.playbackRate = speechRate;
        audioElementRef.current.play();
      } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.resume();
      }
      setIsPlaying(true);
      setIsPaused(false);
    } else {
      playParagraphWithCurrentEngine(currentParagraphIndex);
    }
  };

  const handleNextParagraph = () => {
    if (currentParagraphIndex + 1 < paragraphs.length) {
      playParagraphWithCurrentEngine(currentParagraphIndex + 1);
    }
  };

  const handlePrevParagraph = () => {
    if (currentParagraphIndex - 1 >= 0) {
      playParagraphWithCurrentEngine(currentParagraphIndex - 1);
    }
  };

  if (!activeDocument) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center max-w-xl mx-auto my-12">
        <Volume2 className="h-12 w-12 text-cyan-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white">No hay documento activo para reproducir</h2>
        <p className="text-xs text-slate-400 mt-2">
          Selecciona una obra de la biblioteca o sube un PDF para iniciar la lectura en voz alta.
        </p>
        <button
          onClick={() => setActiveModule('documents')}
          className="mt-6 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg cursor-pointer"
        >
          Ir a Mis PDFs y Textos →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
          <Volume2 className="h-6 w-6 text-cyan-400" />
          <span>Lectura en Voz Alta Guiada y Tranquila</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Escucha la narración con tonos suaves, pausados y relajantes para asimilar la lectura sin prisas ni fatiga auditiva.
        </p>
      </div>

      {engine === 'neural' && <AiAccountGateBanner moduleLabel="Voz Neural HD" />}

      {/* Voice Persona Selector (Soft & Calm Presets) */}
      <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Personalidades de Voz Suave y Tranquila
            </span>
          </div>

          {/* Engine Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                stopAll();
                setEngine('neural');
              }}
              className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center space-x-1 ${
                engine === 'neural'
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Wand2 className="h-3 w-3" />
              <span>Voz Neural HD (Recomendada)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                stopAll();
                setEngine('browser');
              }}
              className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
                engine === 'browser'
                  ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Voz Local Navegador</span>
            </button>
          </div>
        </div>

        {/* 4 Soft Persona Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {VOICE_PERSONAS.map((persona) => {
            const isSelected = selectedPersonaId === persona.id;
            return (
              <button
                key={persona.id}
                type="button"
                onClick={() => applyPersona(persona)}
                className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-cyan-400 bg-gradient-to-b from-indigo-950/80 to-slate-900 shadow-md ring-1 ring-cyan-400/40'
                    : 'border-slate-800 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-950/80'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-white flex items-center space-x-1">
                      <Feather className={`h-3 w-3 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                      <span className="truncate">{persona.name}</span>
                    </span>
                    {isSelected && (
                      <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">{persona.description}</p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-indigo-300">
                  <span className="font-medium italic">{persona.tone}</span>
                  <span className="text-slate-400">{persona.defaultRate}x</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Playback Controller */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Texto en Reproducción
            </span>
            <h2 className="text-lg font-bold text-white mt-0.5">{activeDocument.title}</h2>
            <p className="text-xs text-slate-400">
              Párrafo {currentParagraphIndex + 1} de {paragraphs.length} • Modalidad: {currentPersona.name} ({speechRate}x)
            </p>
          </div>

          {/* Master Transport Controls */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrevParagraph}
              disabled={currentParagraphIndex === 0 || isLoadingAudio}
              title="Párrafo anterior"
              className="p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Rewind className="h-4 w-4" />
            </button>

            {isLoadingAudio ? (
              <button
                disabled
                className="flex items-center space-x-2 rounded-xl bg-indigo-700 text-white font-bold px-6 py-2.5 shadow-lg opacity-80"
              >
                <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
                <span className="text-xs">Generando voz...</span>
              </button>
            ) : isPlaying ? (
              <button
                onClick={handlePlayToggle}
                className="flex items-center space-x-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-2.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Pause className="h-5 w-5" />
                <span className="text-xs">Pausar</span>
              </button>
            ) : (
              <button
                onClick={handlePlayToggle}
                className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold px-6 py-2.5 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <Play className="h-5 w-5 fill-current" />
                <span className="text-xs">{isPaused ? 'Reanudar lectura' : 'Escuchar ahora'}</span>
              </button>
            )}

            <button
              onClick={stopAll}
              title="Detener lectura"
              className="p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <Square className="h-4 w-4" />
            </button>

            <button
              onClick={handleNextParagraph}
              disabled={currentParagraphIndex >= paragraphs.length - 1 || isLoadingAudio}
              title="Siguiente párrafo"
              className="p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <FastForward className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Controls: Speed, Tone/Pitch, Quick Presets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
          {/* 1. Fine Speed Control with Calm Presets */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center space-x-1.5">
                <Sliders className="h-3.5 w-3.5 text-cyan-400" />
                <span>Velocidad de Lectura</span>
              </span>
              <span className="text-cyan-400 font-extrabold">{speechRate.toFixed(2)}x</span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {[0.75, 0.85, 0.9, 1.0, 1.15].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => {
                    setSpeechRate(rate);
                    if (audioElementRef.current) {
                      audioElementRef.current.playbackRate = rate;
                    }
                  }}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    speechRate === rate
                      ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-cyan-400'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {rate === 0.75 ? '0.75x' : rate === 0.85 ? 'Pausada' : rate === 0.9 ? 'Suave' : rate === 1.0 ? '1.0x' : '1.15x'}
                </button>
              ))}
            </div>

            <input
              type="range"
              min="0.65"
              max="1.35"
              step="0.05"
              value={speechRate}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setSpeechRate(val);
                if (audioElementRef.current) {
                  audioElementRef.current.playbackRate = val;
                }
              }}
              className="w-full accent-cyan-400 bg-slate-800 h-2 rounded-lg cursor-pointer mt-1"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Muy lenta y tranquila (0.65x)</span>
              <span>Dinámica (1.35x)</span>
            </div>
          </div>

          {/* 2. Pitch / Modulation Control (Soft, Warm, Deep) */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-300">
              <span>Tono y Suavidad de Voz</span>
              <span className="text-indigo-300 font-bold">
                {speechPitch <= 0.85 ? 'Grave y Relajada' : speechPitch <= 0.98 ? 'Suave y Serena' : 'Brillante'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: 'Grave y Cálida', pitch: 0.82 },
                { label: 'Suave y Dulce', pitch: 0.95 },
                { label: 'Voz Estándar', pitch: 1.05 },
              ].map((pItem) => (
                <button
                  key={pItem.pitch}
                  type="button"
                  onClick={() => {
                    setSpeechPitch(pItem.pitch);
                    if (isPlaying && engine === 'browser') {
                      speakWithBrowserTTS(currentParagraphIndex, speechRate, pItem.pitch);
                    }
                  }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold truncate transition-all ${
                    Math.abs(speechPitch - pItem.pitch) < 0.05
                      ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {pItem.label}
                </button>
              ))}
            </div>

            <input
              type="range"
              min="0.75"
              max="1.25"
              step="0.05"
              value={speechPitch}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setSpeechPitch(val);
                if (isPlaying && engine === 'browser') {
                  speakWithBrowserTTS(currentParagraphIndex, speechRate, val);
                }
              }}
              className="w-full accent-indigo-400 bg-slate-800 h-2 rounded-lg cursor-pointer mt-1"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Grave y serena</span>
              <span>Neutro</span>
              <span>Agudo</span>
            </div>
          </div>

          {/* 3. Browser Voice Selector (when local engine is used) */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              {engine === 'neural' ? 'Voz de respaldo del navegador' : 'Voz activa del navegador'}
            </label>
            <select
              value={selectedBrowserVoiceURI}
              onChange={(e) => {
                setSelectedBrowserVoiceURI(e.target.value);
                if (isPlaying && engine === 'browser') {
                  speakWithBrowserTTS(currentParagraphIndex);
                }
              }}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              {browserVoices
                .filter((v) => v.lang.startsWith('es') || v.lang.includes('Spanish') || true)
                .map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
            </select>

            <div className="rounded-lg bg-slate-950/60 p-2 border border-slate-800/80 text-[11px] text-slate-400 flex items-center space-x-2">
              <Heart className="h-3.5 w-3.5 text-rose-400 shrink-0" />
              <span>
                {engine === 'neural'
                  ? 'La Voz Neural reproduce inflexiones humanas pausadas y sin estridencias.'
                  : 'Sintetizador local del dispositivo activo con velocidad adaptada.'}
              </span>
            </div>
          </div>
        </div>

        {statusMessage && (
          <div className="text-xs text-cyan-300 bg-cyan-950/30 border border-cyan-500/30 rounded-xl p-2.5 flex items-center space-x-2 animate-in fade-in">
            <Info className="h-4 w-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* Paragraph-by-Paragraph Interactive Reader */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <BookOpen className="h-4 w-4 text-cyan-400" />
            <span>Lectura Asistida por Párrafos</span>
          </h3>
          <span className="text-xs text-slate-400">
            Toca cualquier párrafo para comenzar a escucharlo con la voz suave
          </span>
        </div>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
          {visibleParagraphs.map((p, localIdx) => {
            const idx = visiblePage * PARAGRAPHS_PER_PAGE + localIdx;
            const isCurrent = currentParagraphIndex === idx;
            return (
              <div
                key={idx}
                onClick={() => playParagraph(idx)}
                className={`p-4 rounded-xl border text-xs sm:text-sm font-serif-reading leading-relaxed transition-all cursor-pointer ${
                  isCurrent
                    ? 'border-cyan-400 bg-gradient-to-r from-indigo-950/70 via-slate-900 to-slate-900 text-white shadow-md ring-1 ring-cyan-400/40'
                    : 'border-slate-800/80 bg-slate-950/40 text-slate-300 hover:border-slate-700 hover:bg-slate-950/80'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1 font-sans">
                  <span className="font-semibold text-cyan-400">Párrafo {idx + 1} de {paragraphs.length}</span>
                  {isCurrent && (
                    <span className="flex items-center space-x-1 text-cyan-300 font-semibold animate-pulse">
                      <Volume2 className="h-3.5 w-3.5" />
                      <span>{isPlaying ? 'Reproduciendo con voz suave...' : isPaused ? 'Pausado aquí' : 'Listo'}</span>
                    </span>
                  )}
                </div>
                <p>{p}</p>
              </div>
            );
          })}
        </div>

        {totalParagraphPages > 1 && (
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <button
              type="button"
              disabled={visiblePage === 0}
              onClick={() => setVisiblePage((p) => Math.max(0, p - 1))}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Bloque anterior</span>
            </button>
            <span className="text-xs text-slate-400">
              Bloque <strong className="text-cyan-300">{visiblePage + 1}</strong> de {totalParagraphPages}
            </span>
            <button
              type="button"
              disabled={visiblePage >= totalParagraphPages - 1}
              onClick={() => setVisiblePage((p) => Math.min(totalParagraphPages - 1, p + 1))}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
            >
              <span>Siguiente bloque</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
