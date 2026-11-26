import React, { useState, useRef } from 'react';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  Trash2,
  Eye,
  BookOpen,
  AlertCircle,
  Sparkles,
  Loader2,
  Plus,
  FileCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  Database,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { extractTextFromPdfFile, extractTextFromTxtFile } from '../../services/pdfParser';
import { paginateDocumentContent } from '../../services/textChunker';
import { DocumentItem } from '../../types';

export const PdfManagerView: React.FC = () => {
  const { documents, activeDocument, setActiveDocument, addDocument, deleteDocument, setActiveModule } =
    useApp();

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressInfo, setProgressInfo] = useState<{ current: number; total: number; percent: number } | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [previewPageIndex, setPreviewPageIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showManualAdd, setShowManualAdd] = useState(false);

  const previewPages = React.useMemo(() => {
    if (!previewDoc) return [];
    return paginateDocumentContent(previewDoc.content, 3200);
  }, [previewDoc]);

  const openPreview = (doc: DocumentItem) => {
    setPreviewPageIndex(0);
    setPreviewDoc(doc);
  };

  // Manual text entry state
  const [manualTitle, setManualTitle] = useState('');
  const [manualAuthor, setManualAuthor] = useState('');
  const [manualContent, setManualContent] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setProgressInfo(null);

    try {
      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
      const isTxt =
        file.name.toLowerCase().endsWith('.txt') ||
        file.name.toLowerCase().endsWith('.md') ||
        file.type.startsWith('text/');

      if (!isPdf && !isTxt) {
        throw new Error('Por favor, selecciona un archivo en formato PDF (.pdf) o Texto plano (.txt, .md).');
      }

      let parsed;
      if (isPdf) {
        parsed = await extractTextFromPdfFile(file, (p) => setProgressInfo(p));
      } else {
        parsed = await extractTextFromTxtFile(file);
      }

      const newDoc: DocumentItem = {
        id: `doc-${Date.now()}`,
        title: parsed.title,
        author: 'Documento subido por el estudiante',
        genre: isPdf ? 'Documento PDF' : 'Texto digital',
        pageCount: parsed.pageCount,
        wordCount: parsed.wordCount,
        content: parsed.text,
        dateAdded: new Date().toISOString().slice(0, 10),
        sourceType: isPdf ? 'pdf' : 'text',
        summary: parsed.text.slice(0, 200).replace(/\n/g, ' ') + '...',
      };

      addDocument(newDoc);
      setIsProcessing(false);
      setProgressInfo(null);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Ocurrió un error al procesar el archivo.');
      setIsProcessing(false);
      setProgressInfo(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim() || !manualContent.trim()) {
      setErrorMessage('Por favor ingresa un título y el contenido del texto.');
      return;
    }

    const words = manualContent.trim().split(/\s+/).filter(Boolean).length;
    const newDoc: DocumentItem = {
      id: `doc-manual-${Date.now()}`,
      title: manualTitle.trim(),
      author: manualAuthor.trim() || 'Autor del estudiante',
      genre: 'Texto personalizado',
      pageCount: Math.ceil(words / 350) || 1,
      wordCount: words,
      content: manualContent,
      dateAdded: new Date().toISOString().slice(0, 10),
      sourceType: 'text',
      summary: manualContent.slice(0, 200).replace(/\n/g, ' ') + '...',
    };

    addDocument(newDoc);
    setShowManualAdd(false);
    setManualTitle('');
    setManualAuthor('');
    setManualContent('');
    setErrorMessage(null);
  };

  const filteredDocs = documents.filter(
    (d) =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.author?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
            <FileText className="h-6 w-6 text-cyan-400" />
            <span>Mis Documentos y PDFs</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Sube obras, tratados y libros extensos de más de 1,000 páginas en PDF; LEIA los indexa localmente en IndexedDB para lectura guiada y exámenes completos.
          </p>
        </div>

        <button
          onClick={() => setShowManualAdd(!showManualAdd)}
          className="inline-flex items-center space-x-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4 text-cyan-400" />
          <span>{showManualAdd ? 'Cerrar editor' : 'Pegar texto manual'}</span>
        </button>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-xs text-rose-200 flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-rose-300">Aviso sobre el documento:</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-200 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Manual text form toggle */}
      {showManualAdd && (
        <form
          onSubmit={handleManualSubmit}
          className="rounded-2xl border border-indigo-500/30 bg-slate-900/90 p-6 space-y-4 shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <span>Pegar Fragmento o Texto Manual</span>
            </h3>
            <span className="text-xs text-slate-400">LEIA extraerá y analizará el contenido</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Título de la obra / lectura *</label>
              <input
                type="text"
                required
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="Ej. Cien Años de Soledad (Capítulo 1)"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Autor o fuente (opcional)</label>
              <input
                type="text"
                value={manualAuthor}
                onChange={(e) => setManualAuthor(e.target.value)}
                placeholder="Ej. Gabriel García Márquez"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Contenido completo del texto *</label>
            <textarea
              required
              rows={6}
              value={manualContent}
              onChange={(e) => setManualContent(e.target.value)}
              placeholder="Pega aquí el texto que deseas leer y analizar con LEIA..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-serif-reading leading-relaxed"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setShowManualAdd(false)}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-md cursor-pointer"
            >
              Guardar y Seleccionar Texto
            </button>
          </div>
        </form>
      )}

      {/* Drag & Drop PDF Uploader */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative overflow-hidden rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-cyan-400 bg-cyan-950/20 scale-[0.99]'
            : 'border-slate-700 bg-slate-900/40 hover:border-indigo-500/50 hover:bg-slate-900/70'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md,text/plain,application/pdf"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileUpload(e.target.files[0]);
            }
          }}
        />

        {isProcessing ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="h-10 w-10 text-cyan-400 animate-spin" />
            <div className="text-sm font-bold text-white">Extrayendo texto del documento...</div>
            {progressInfo ? (
              <div className="w-64 space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Página {progressInfo.current} de {progressInfo.total}</span>
                  <span>{progressInfo.percent}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 rounded-full transition-all"
                    style={{ width: `${progressInfo.percent}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Decodificando estructura del archivo PDF...</p>
            )}
          </div>
        ) : (
          <div className="py-4 flex flex-col items-center justify-center space-y-2">
            <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-cyan-300">
              <UploadCloud className="h-7 w-7" />
            </div>
            <div className="text-base font-bold text-white">
              Haz clic o arrastra un archivo PDF o documento aquí
            </div>
            <p className="text-xs text-slate-400 max-w-md">
              Soporta libros extensos (+1,000 páginas) en PDF con texto seleccionable, archivos TXT y apuntes. Todo se procesa y guarda localmente en tu dispositivo.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-[11px] text-indigo-300 font-semibold">
              <span className="rounded bg-indigo-500/20 px-2 py-0.5 border border-indigo-500/30">.PDF (+1,000 pág.)</span>
              <span className="rounded bg-indigo-500/20 px-2 py-0.5 border border-indigo-500/30">.TXT</span>
              <span className="rounded bg-indigo-500/20 px-2 py-0.5 border border-indigo-500/30">.MD</span>
              <span className="inline-flex items-center space-x-1 rounded bg-cyan-500/15 px-2 py-0.5 border border-cyan-500/30 text-cyan-300">
                <Database className="h-3 w-3" />
                <span>Almacenamiento IndexedDB</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Library of Documents */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-indigo-400" />
              <span>Biblioteca de Lecturas ({documents.length})</span>
            </h2>
            <p className="text-xs text-slate-400">Selecciona el texto con el que deseas trabajar en todos los módulos</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título o autor..."
              className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {filteredDocs.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-10 text-center space-y-3">
            <BookOpen className="h-10 w-10 text-indigo-400/70 mx-auto" />
            <h3 className="text-sm font-bold text-white">
              {documents.length === 0
                ? 'Tu biblioteca está lista para tu primer libro o PDF'
                : 'No se encontraron documentos con esa búsqueda'}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {documents.length === 0
                ? 'Arrastra un archivo PDF (incluso libros de más de 1,000 páginas), TXT o MD en el recuadro superior, o pega un texto manual para empezar.'
                : 'Prueba con otro término de búsqueda o limpia el filtro.'}
            </p>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocs.map((doc) => {
            const isSelected = activeDocument?.id === doc.id;
            return (
              <div
                key={doc.id}
                className={`rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-indigo-500 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 shadow-md ring-1 ring-indigo-500/30'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`inline-flex items-center space-x-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        doc.sourceType === 'pdf'
                          ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                          : doc.sourceType === 'sample'
                          ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                          : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      <FileCheck className="h-3 w-3" />
                      <span>{doc.sourceType === 'pdf' ? 'PDF' : doc.sourceType === 'sample' ? 'Clásico' : 'Texto'}</span>
                    </span>

                    {isSelected && (
                      <span className="inline-flex items-center space-x-1 text-xs text-indigo-300 font-semibold bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-400/30">
                        <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" />
                        <span>En Estudio</span>
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-base text-white line-clamp-1">{doc.title}</h3>
                  <p className="text-xs text-indigo-300 font-medium mt-0.5">
                    {doc.author || 'Sin autor especificado'} • {doc.genre || 'Literatura'}
                  </p>

                  <p className="text-xs text-slate-400 mt-2.5 line-clamp-2 leading-relaxed">
                    {doc.summary || doc.content.slice(0, 160) + '...'}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="text-[11px] text-slate-400 space-x-2">
                    <span>{doc.wordCount.toLocaleString()} palabras</span>
                    <span>•</span>
                    <span>{doc.pageCount || 1} pág.</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openPreview(doc)}
                      title="Previsualizar contenido extraído"
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                    </button>

                    {doc.sourceType !== 'sample' && (
                      <button
                        onClick={() => deleteDocument(doc.id)}
                        title="Eliminar de la biblioteca"
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setActiveDocument(doc);
                        setActiveModule('guided_reading');
                      }}
                      className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm'
                          : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {isSelected ? 'Abrir en Tutoría' : 'Seleccionar'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* Document Text Preview Modal (Paginated for 1000+ page books) */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 gap-2">
              <div className="min-w-0">
                <h3 className="font-bold text-white text-base truncate">{previewDoc.title}</h3>
                <p className="text-xs text-slate-400">
                  {previewDoc.author} • {previewDoc.wordCount.toLocaleString()} palabras • {previewPages.length} secciones
                </p>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white text-sm shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Pagination bar inside modal */}
            {previewPages.length > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800/80 text-xs">
                <span className="text-cyan-300 font-semibold">
                  {previewPages[previewPageIndex]?.label || `Sección ${previewPageIndex + 1}`} de {previewPages.length}
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    disabled={previewPageIndex === 0}
                    onClick={() => setPreviewPageIndex((p) => Math.max(0, p - 1))}
                    className="inline-flex items-center space-x-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-slate-200 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Anterior</span>
                  </button>
                  <div className="flex items-center space-x-1 text-[11px] text-slate-400">
                    <span>Ir a:</span>
                    <input
                      type="number"
                      min={1}
                      max={previewPages.length}
                      value={previewPageIndex + 1}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 1 && val <= previewPages.length) {
                          setPreviewPageIndex(val - 1);
                        }
                      }}
                      className="w-14 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-center text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={previewPageIndex >= previewPages.length - 1}
                    onClick={() => setPreviewPageIndex((p) => Math.min(previewPages.length - 1, p + 1))}
                    className="inline-flex items-center space-x-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-slate-200 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                  >
                    <span>Siguiente</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto pr-2 text-xs sm:text-sm text-slate-200 font-serif-reading leading-relaxed whitespace-pre-line bg-slate-950 p-4 rounded-xl border border-slate-800">
              {previewPages[previewPageIndex]?.content || previewDoc.content}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400">Vista paginada fluida para libros extensos</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    setActiveDocument(previewDoc);
                    setPreviewDoc(null);
                    setActiveModule('guided_reading');
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  Estudiar con este texto →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
