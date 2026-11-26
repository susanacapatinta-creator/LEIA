import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker from a reliable CDN matching version
if (typeof window !== 'undefined') {
  // @ts-ignore
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
}

export interface ParsedPdfResult {
  text: string;
  pageCount: number;
  wordCount: number;
  title: string;
}

export async function extractTextFromPdfFile(
  file: File,
  onProgress?: (progress: { current: number; total: number; percent: number }) => void
): Promise<ParsedPdfResult> {
  const arrayBuffer = await file.arrayBuffer();

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
    });

    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    const pageTexts: string[] = [];
    let totalWords = 0;

    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str ?? '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (pageText) {
        pageTexts.push(`--- Página ${i} ---\n${pageText}`);
        totalWords += pageText.split(/\s+/).filter(Boolean).length;
      }

      // Free per-page memory for large 1000+ page books
      if (typeof page.cleanup === 'function') {
        page.cleanup();
      }

      if (onProgress && (i % 5 === 0 || i === numPages || i === 1)) {
        onProgress({
          current: i,
          total: numPages,
          percent: Math.round((i / numPages) * 100),
        });
      }

      // Yield to main thread periodically so UI & progress bar remain responsive on 1000+ page PDFs
      if (i % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    const maybeDestroyable = pdfDoc as unknown as { destroy?: () => Promise<void> };
    if (typeof maybeDestroyable.destroy === 'function') {
      await maybeDestroyable.destroy();
    }

    const fullText = pageTexts.join('\n\n');

    if (totalWords < 15) {
      throw new Error(
        'El archivo PDF no contiene texto legible (parece ser un documento escaneado como imagen o protegido). Para usarlo con LEIA, sube un PDF con texto seleccionable o cópialo como texto.'
      );
    }

    const sanitizedTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

    return {
      title: sanitizedTitle,
      text: fullText,
      pageCount: numPages,
      wordCount: totalWords,
    };
  } catch (error: any) {
    console.error('Error extrayendo texto del PDF:', error);
    throw new Error(error?.message || 'No se pudo leer el archivo PDF.');
  }
}

export async function extractTextFromTxtFile(file: File): Promise<ParsedPdfResult> {
  const content = await file.text();
  const cleanWords = content.trim().split(/\s+/).filter(Boolean);
  const sanitizedTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

  return {
    title: sanitizedTitle,
    text: content,
    pageCount: Math.ceil(cleanWords.length / 350) || 1,
    wordCount: cleanWords.length,
  };
}
