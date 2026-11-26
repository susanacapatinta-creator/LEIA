import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Sparkles,
  Send,
  HelpCircle,
  Quote,
  Trash2,
  Search,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Type,
  CornerDownLeft,
  CheckCircle,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ComprehensionLevel, ChatMessage } from '../../types';
import { sendSocraticChatMessage } from '../../services/api';
import { paginateDocumentContent, retrieveRelevantExcerpts } from '../../services/textChunker';
import { AiAccountGateBanner } from '../auth/AuthModal';

export const GuidedReadingView: React.FC = () => {
  const {
    activeDocument,
    activeLevel,
    setActiveLevel,
    chatMessages,
    addChatMessage,
    clearChatHistory,
    recordInteraction,
    settings,
    setActiveModule,
    currentUser,
    openAuthModal,
  } = useApp();

  const [inputMessage, setInputMessage] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [readerFont, setReaderFont] = useState<'serif' | 'sans'>(settings.readingFont || 'serif');
  const [readerFontSize, setReaderFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentPageIdx, setCurrentPageIdx] = useState(0);
  const [jumpPageInput, setJumpPageInput] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const readerRef = useRef<HTMLDivElement>(null);

  const docId = activeDocument?.id || 'default';
  const currentChat = chatMessages[docId] || [];

  // Paginate massive 1000+ page books smoothly
  const bookPages = React.useMemo(() => {
    if (!activeDocument?.content) return [];
    return paginateDocumentContent(activeDocument.content, 3200);
  }, [activeDocument?.id, activeDocument?.content]);

  useEffect(() => {
    setCurrentPageIdx(0);
    setSearchTerm('');
  }, [activeDocument?.id]);

  const activePage = bookPages[currentPageIdx] || bookPages[0];

  // Matching pages for global search across 1000+ pages
  const matchingPageIndices = React.useMemo(() => {
    if (!searchTerm.trim() || bookPages.length === 0) return [];
    const q = searchTerm.toLowerCase();
    const hits: number[] = [];
    bookPages.forEach((p, idx) => {
      if (p.content.toLowerCase().includes(q)) {
        hits.push(idx);
      }
    });
    return hits;
  }, [searchTerm, bookPages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChat, isLoading]);

  // Capture user text selection inside the document reader
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim());
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || inputMessage).trim();
    if (!messageContent || isLoading) return;

    if (!activeDocument) {
      setErrorMessage('Selecciona un documento primero para iniciar la lectura guiada.');
      return;
    }

    if (!currentUser) {
      openAuthModal('Crea tu cuenta gratuita o inicia sesión en LEIA para conversar con la tutora socrática.');
      return;
    }

    setErrorMessage(null);
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: messageContent,
      timestamp: new Date().toISOString(),
      level: activeLevel,
      quotedText: selectedText || undefined,
    };

    addChatMessage(docId, userMsg);
    setInputMessage('');
    const quoteToClear = selectedText;
    setSelectedText('');
    setIsLoading(true);

    try {
      const historyFormatted = currentChat.slice(-6).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      // Contextual search across entire book (even 1000+ pages) + active page
      const excerpt = retrieveRelevantExcerpts({
        fullContent: activeDocument.content,
        query: messageContent,
        quotedText: quoteToClear,
        currentPageContent: activePage?.content || '',
        currentPageLabel: activePage?.label || 'Página 1',
        maxTotalChars: 24000,
      });

      const res = await sendSocraticChatMessage({
        documentTitle: activeDocument.title,
        documentExcerpt: excerpt,
        level: activeLevel,
        chatHistory: historyFormatted,
        userMessage: quoteToClear
          ? `[Refiriéndome a la cita: "${quoteToClear}"] ${messageContent}`
          : messageContent,
        studentProfile: settings.educationLevel,
      });

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        text: res.reply,
        timestamp: res.timestamp || new Date().toISOString(),
        level: activeLevel,
      };

      addChatMessage(docId, assistantMsg);
      recordInteraction(activeLevel);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err?.message ||
          'No se pudo conectar con LEIA. Asegúrate de que el servidor esté activo o revisa la conexión.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const levelConfigs: Record<
    ComprehensionLevel,
    { title: string; subtitle: string; badge: string; color: string; iconColor: string }
  > = {
    literal: {
      title: 'Nivel 1: Literal',
      subtitle: 'Localizar hechos explícitos, personajes, lugares y sucesos directos.',
      badge: 'Información Textual',
      color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
      iconColor: 'text-emerald-400',
    },
    inferential: {
      title: 'Nivel 2: Inferencial',
      subtitle: 'Deducir motivaciones ocultas, intenciones, dobles sentidos y causas no dichas.',
      badge: 'Pistas y Deducción',
      color: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
      iconColor: 'text-indigo-400',
    },
    critical: {
      title: 'Nivel 3: Crítico',
      subtitle: 'Emitir juicios fundamentados, responder contrapreguntas y evaluar dilemas éticos.',
      badge: 'Argumentación y Postura',
      color: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
      iconColor: 'text-amber-400',
    },
  };

  // Quick pedagogical chips
  const quickPrompts: Record<ComprehensionLevel, string[]> = {
    literal: [
      '¿En qué parte exacta del texto se menciona esto?',
      '¿Cuáles son los personajes principales nombrados aquí?',
      '¿Qué acontecimiento desencadena esta escena?',
    ],
    inferential: [
      'Dame una pista progresiva para deducir esto.',
      '¿Qué motivación psicológica esconde este personaje?',
      '¿Qué simbolismo o atmósfera sugiere este párrafo?',
    ],
    critical: [
      'Plantéame una contrapregunta para poner a prueba mi postura.',
      '¿Qué dilema moral enfrenta el autor o protagonista?',
      '¿Cómo sustento mi juicio frente a una postura contraria?',
    ],
  };

  if (!activeDocument) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center max-w-xl mx-auto my-12">
        <BookOpen className="h-12 w-12 text-cyan-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white">No hay ningún texto seleccionado</h2>
        <p className="text-xs text-slate-400 mt-2">
          Para iniciar la lectura guiada con la tutora socrática, selecciona una obra de la biblioteca o sube un documento PDF.
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

  // Helper to render current page text with highlighted search terms
  const renderHighlightedContent = () => {
    const pageText = activePage?.content || activeDocument.content;
    if (!searchTerm.trim()) {
      return pageText;
    }
    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = pageText.split(new RegExp(`(${escaped})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <mark key={i} className="bg-amber-400/30 text-amber-200 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const handleJumpToSearchHit = (direction: 'next' | 'prev') => {
    if (matchingPageIndices.length === 0) return;
    if (direction === 'next') {
      const nextHit = matchingPageIndices.find((idx) => idx > currentPageIdx);
      setCurrentPageIdx(nextHit !== undefined ? nextHit : matchingPageIndices[0]);
    } else {
      const prevHits = matchingPageIndices.filter((idx) => idx < currentPageIdx);
      setCurrentPageIdx(prevHits.length > 0 ? prevHits[prevHits.length - 1] : matchingPageIndices[matchingPageIndices.length - 1]);
    }
    readerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col space-y-3">
      {/* Top Bar: Document Title, Level Tabs, and Reader Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-slate-900/70 border border-slate-800 rounded-2xl p-3 shrink-0">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="h-9 w-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-cyan-300 shrink-0">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="truncate">
            <h2 className="text-sm font-bold text-white truncate">{activeDocument.title}</h2>
            <p className="text-[11px] text-slate-400 truncate">
              {activeDocument.author || 'Lectura formativa'} • {activeDocument.wordCount} palabras
            </p>
          </div>
        </div>

        {/* 3 Level Selector Buttons */}
        <div className="flex items-center space-x-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80">
          {(['literal', 'inferential', 'critical'] as ComprehensionLevel[]).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setActiveLevel(lvl)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                activeLevel === lvl
                  ? levelConfigs[lvl].color + ' shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {lvl === 'literal' ? '1. Literal' : lvl === 'inferential' ? '2. Inferencial' : '3. Crítico'}
            </button>
          ))}
        </div>
      </div>

      <AiAccountGateBanner moduleLabel="Lectura Guiada" />

      {/* Main Split Layout: Left Text Reader / Right Socratic Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
        {/* Left: Text Reader (5 cols on lg, 6 on xl) */}
        <div className="lg:col-span-6 xl:col-span-6 flex flex-col rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-lg">
          {/* Reader toolbar */}
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5 bg-slate-950/60 text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
                Visor de Lectura
              </span>
              {selectedText && (
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-medium animate-pulse">
                  Texto seleccionado
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {/* Search across all pages */}
              <div className="relative flex items-center space-x-1">
                <div className="relative w-28 sm:w-36">
                  <Search className="h-3 w-3 text-slate-500 absolute left-2 top-2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearchTerm(val);
                      if (val.trim()) {
                        const firstHit = bookPages.findIndex((p) =>
                          p.content.toLowerCase().includes(val.toLowerCase())
                        );
                        if (firstHit !== -1) setCurrentPageIdx(firstHit);
                      }
                    }}
                    placeholder="Buscar en libro..."
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 pl-7 pr-2 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                {searchTerm.trim() && (
                  <div className="flex items-center space-x-1 text-[10px] text-amber-300 bg-amber-950/40 border border-amber-500/30 rounded-lg px-1.5 py-0.5">
                    <span>{matchingPageIndices.length} pág.</span>
                    <button
                      type="button"
                      onClick={() => handleJumpToSearchHit('prev')}
                      className="hover:text-white px-0.5"
                      title="Coincidencia anterior"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() => handleJumpToSearchHit('next')}
                      className="hover:text-white px-0.5"
                      title="Siguiente coincidencia"
                    >
                      ›
                    </button>
                  </div>
                )}
              </div>

              {/* Font toggle */}
              <button
                onClick={() => setReaderFont(readerFont === 'serif' ? 'sans' : 'serif')}
                title="Cambiar tipografía (Serif / Sans)"
                className="p-1 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
              >
                <Type className="h-3.5 w-3.5" />
              </button>

              {/* Font size toggle */}
              <button
                onClick={() =>
                  setReaderFontSize(
                    readerFontSize === 'sm' ? 'base' : readerFontSize === 'base' ? 'lg' : 'sm'
                  )
                }
                title="Ajustar tamaño de texto"
                className="px-2 py-0.5 rounded-lg border border-slate-800 bg-slate-900 text-[11px] font-bold text-slate-400 hover:text-white"
              >
                {readerFontSize === 'sm' ? 'A' : readerFontSize === 'base' ? 'A+' : 'A++'}
              </button>
            </div>
          </div>

          {/* Reader Text Body */}
          <div
            ref={readerRef}
            onMouseUp={handleTextSelection}
            onTouchEnd={handleTextSelection}
            className={`flex-1 overflow-y-auto p-5 text-slate-200 select-text leading-relaxed whitespace-pre-line ${
              readerFont === 'serif' ? 'font-serif-reading' : 'font-sans'
            } ${
              readerFontSize === 'sm'
                ? 'text-xs'
                : readerFontSize === 'base'
                ? 'text-sm sm:text-base'
                : 'text-base sm:text-lg'
            }`}
          >
            {renderHighlightedContent()}
          </div>

          {/* Book Pagination Footer (handles 1000+ pages smoothly) */}
          {bookPages.length > 1 && (
            <div className="border-t border-slate-800 bg-slate-950/70 px-3 py-2 flex items-center justify-between text-[11px] text-slate-300">
              <button
                type="button"
                disabled={currentPageIdx === 0}
                onClick={() => {
                  setCurrentPageIdx((p) => Math.max(0, p - 1));
                  readerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Anterior</span>
              </button>

              <div className="flex items-center space-x-2">
                <span className="font-semibold text-cyan-300">{activePage?.label}</span>
                <span className="text-slate-500">de {bookPages.length}</span>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const num = parseInt(jumpPageInput, 10);
                    if (!isNaN(num) && num >= 1 && num <= bookPages.length) {
                      setCurrentPageIdx(num - 1);
                      setJumpPageInput('');
                      readerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className="hidden sm:flex items-center space-x-1 ml-1"
                >
                  <input
                    type="number"
                    min={1}
                    max={bookPages.length}
                    value={jumpPageInput}
                    onChange={(e) => setJumpPageInput(e.target.value)}
                    placeholder="Ir a #"
                    className="w-16 rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </form>
              </div>

              <button
                type="button"
                disabled={currentPageIdx >= bookPages.length - 1}
                onClick={() => {
                  setCurrentPageIdx((p) => Math.min(bookPages.length - 1, p + 1));
                  readerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              >
                <span>Siguiente</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Selection Quick Action Footer */}
          {selectedText && (
            <div className="border-t border-slate-800 bg-indigo-950/40 p-2.5 px-4 flex items-center justify-between animate-in slide-in-from-bottom-2">
              <div className="flex items-center space-x-2 text-xs text-indigo-300 truncate max-w-xs">
                <Quote className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                <span className="truncate italic">"{selectedText}"</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setInputMessage(`¿Qué significa o implica este pasaje: "${selectedText}"?`);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-500 cursor-pointer"
                >
                  Citar en Chat
                </button>
                <button
                  onClick={() => setSelectedText('')}
                  className="text-slate-400 hover:text-white text-xs px-1"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Socratic Chat with LEIA (6 cols on lg) */}
        <div className="lg:col-span-6 xl:col-span-6 flex flex-col rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden shadow-lg">
          {/* Chat Header with pedagogical role reminder */}
          <div className="border-b border-slate-800 px-4 py-2.5 bg-slate-950/60 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 inline-block"></span>
                <span className="animate-ping absolute inset-0 h-2.5 w-2.5 rounded-full bg-cyan-400 opacity-75"></span>
              </div>
              <div>
                <span className="text-xs font-bold text-white">Tutora Socrática LEIA</span>
                <span className="text-[10px] text-slate-400 ml-2">
                  Modo: {levelConfigs[activeLevel].badge}
                </span>
              </div>
            </div>

            <button
              onClick={() => clearChatHistory(docId)}
              title="Reiniciar diálogo socrático"
              className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 text-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Level banner description */}
          <div className={`px-4 py-2 border-b text-[11px] ${levelConfigs[activeLevel].color}`}>
            <p className="font-semibold">{levelConfigs[activeLevel].title}</p>
            <p className="text-[10px] opacity-90">{levelConfigs[activeLevel].subtitle}</p>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {currentChat.map((msg) => {
              const isAssistant = msg.role === 'assistant';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}
                >
                  <div className="flex items-center space-x-1.5 mb-1 text-[10px] text-slate-400">
                    <span className="font-semibold text-slate-300">
                      {isAssistant ? 'LEIA' : settings.userName}
                    </span>
                    <span>•</span>
                    <span className="capitalize">{msg.level || activeLevel}</span>
                  </div>

                  {msg.quotedText && (
                    <div className="mb-1 rounded-lg bg-indigo-950/50 border border-indigo-500/30 p-2 text-[11px] text-indigo-300 italic max-w-[85%]">
                      <Quote className="h-3 w-3 inline mr-1 text-cyan-400" />
                      {msg.quotedText}
                    </div>
                  )}

                  <div
                    className={`rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed max-w-[90%] shadow-md ${
                      isAssistant
                        ? 'bg-slate-950 border border-slate-800 text-slate-100 rounded-tl-sm'
                        : 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-sm'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-start space-x-2">
                <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3 rounded-tl-sm text-xs text-slate-300 flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                  <span>LEIA está analizando el texto y formulando su guía socrática...</span>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-200">
                <ShieldAlert className="h-4 w-4 text-rose-400 inline mr-1.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick pedagogical chips */}
          <div className="px-3 py-2 border-t border-slate-800 bg-slate-950/70 overflow-x-auto flex space-x-2 no-scrollbar">
            {quickPrompts[activeLevel].map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
                className="shrink-0 text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 px-2.5 py-1 rounded-full transition-colors flex items-center space-x-1 cursor-pointer disabled:opacity-50"
              >
                <Lightbulb className="h-3 w-3 text-amber-400" />
                <span>{prompt}</span>
              </button>
            ))}
          </div>

          {/* Input field */}
          <div className="p-3 bg-slate-950 border-t border-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={
                  activeLevel === 'literal'
                    ? 'Pregunta por hechos, fechas o detalles textuales...'
                    : activeLevel === 'inferential'
                    ? 'Propón tu hipótesis o pide una pista de deducción...'
                    : 'Expón tu postura crítica o argumento con el texto...'
                }
                disabled={isLoading}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500 disabled:opacity-50 transition-all font-semibold text-xs flex items-center space-x-1 shadow-md cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Enviar</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
