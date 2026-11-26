// Utilities for handling massive books (1000+ pages, 300k+ words) smoothly

export interface BookPage {
  pageNumber: number;
  label: string;
  content: string;
}

const STOP_WORDS_ES = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'e', 'o', 'u',
  'de', 'del', 'al', 'a', 'en', 'por', 'para', 'con', 'sin', 'sobre', 'entre',
  'que', 'qué', 'cual', 'cuál', 'quien', 'quién', 'como', 'cómo', 'cuando', 'cuándo',
  'donde', 'dónde', 'porque', 'porqué', 'pero', 'mas', 'sino', 'aunque', 'si',
  'es', 'son', 'era', 'fue', 'ser', 'estar', 'está', 'están', 'hay', 'tiene',
  'su', 'sus', 'mi', 'mis', 'tu', 'tus', 'se', 'le', 'les', 'lo', 'me', 'te', 'nos',
  'este', 'esta', 'esto', 'estos', 'estas', 'ese', 'esa', 'eso', 'aquel', 'aquella',
  'muy', 'más', 'menos', 'todo', 'toda', 'todos', 'todas', 'algo', 'nada', 'hacer',
  'cree', 'crees', 'dice', 'dijo', 'pasa', 'significa', 'texto', 'libro', 'página',
]);

/**
 * Splits a document (even 1000+ pages) into paginated sections for fast DOM rendering.
 * Respects `--- Página X ---` markers when present, or chunks by ~3200 chars on paragraph boundaries.
 */
export function paginateDocumentContent(content: string, charsPerPage = 3200): BookPage[] {
  if (!content || !content.trim()) {
    return [{ pageNumber: 1, label: 'Página 1', content: '' }];
  }

  // Check if document has explicit PDF page markers
  const pageMarkerRegex = /(?:^|\n)---\s*Página\s+(\d+)\s*---\n/g;
  const matches = [...content.matchAll(pageMarkerRegex)];

  if (matches.length >= 2) {
    const pages: BookPage[] = [];
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const pageNum = parseInt(match[1], 10);
      const startIdx = (match.index ?? 0) + match[0].length;
      const endIdx = i + 1 < matches.length ? (matches[i + 1].index ?? content.length) : content.length;
      const pageBody = content.slice(startIdx, endIdx).trim();
      if (pageBody) {
        pages.push({
          pageNumber: pageNum,
          label: `Página ${pageNum}`,
          content: pageBody,
        });
      }
    }
    if (pages.length > 0) return pages;
  }

  // Otherwise split cleanly on paragraph boundaries
  const paragraphs = content.split(/\n\s*\n/);
  const pages: BookPage[] = [];
  let currentBuffer: string[] = [];
  let currentLength = 0;
  let pageCounter = 1;

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (currentLength + trimmed.length > charsPerPage && currentBuffer.length > 0) {
      pages.push({
        pageNumber: pageCounter,
        label: `Sección ${pageCounter}`,
        content: currentBuffer.join('\n\n'),
      });
      pageCounter++;
      currentBuffer = [trimmed];
      currentLength = trimmed.length;
    } else {
      currentBuffer.push(trimmed);
      currentLength += trimmed.length + 2;
    }
  }

  if (currentBuffer.length > 0) {
    pages.push({
      pageNumber: pageCounter,
      label: `Sección ${pageCounter}`,
      content: currentBuffer.join('\n\n'),
    });
  }

  return pages.length > 0 ? pages : [{ pageNumber: 1, label: 'Sección 1', content }];
}

/**
 * Retrieves the most relevant excerpts across an entire 1000+ page book
 * using keyword scoring + active page context + quoted text.
 */
export function retrieveRelevantExcerpts(params: {
  fullContent: string;
  query: string;
  quotedText?: string;
  currentPageContent?: string;
  currentPageLabel?: string;
  maxTotalChars?: number;
}): string {
  const {
    fullContent,
    query,
    quotedText = '',
    currentPageContent = '',
    currentPageLabel = '',
    maxTotalChars = 22000,
  } = params;

  if (fullContent.length <= maxTotalChars) {
    return fullContent;
  }

  // Extract meaningful search terms
  const combinedQuery = `${query} ${quotedText}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ');

  const terms = Array.from(
    new Set(
      combinedQuery
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !STOP_WORDS_ES.has(w))
    )
  );

  // Split book into overlapping ~1800-char chunks
  const chunkSize = 1800;
  const overlap = 250;
  const chunks: { index: number; text: string; score: number; pageHint: string }[] = [];

  let pos = 0;
  let idx = 0;
  let lastKnownPage = 'Inicio';

  while (pos < fullContent.length) {
    const slice = fullContent.slice(pos, pos + chunkSize);
    const pageMatch = slice.match(/---\s*Página\s+(\d+)\s*---/);
    if (pageMatch) {
      lastKnownPage = `Página ${pageMatch[1]}`;
    }

    let score = 0;
    if (terms.length > 0) {
      const normSlice = slice
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      for (const term of terms) {
        let searchPos = 0;
        let hits = 0;
        while ((searchPos = normSlice.indexOf(term, searchPos)) !== -1) {
          hits++;
          searchPos += term.length;
          if (hits >= 5) break;
        }
        if (hits > 0) {
          score += 2 + Math.min(hits, 4);
        }
      }
    }

    if (quotedText && slice.includes(quotedText.slice(0, 40))) {
      score += 20;
    }

    chunks.push({ index: idx, text: slice, score, pageHint: lastKnownPage });
    pos += chunkSize - overlap;
    idx++;
  }

  // Sort chunks by score descending
  const ranked = [...chunks]
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);

  const selectedParts: string[] = [];
  let usedChars = 0;

  if (quotedText) {
    const quoteBlock = `[CITA SELECCIONADA POR EL ESTUDIANTE]:\n"${quotedText}"\n`;
    selectedParts.push(quoteBlock);
    usedChars += quoteBlock.length;
  }

  if (currentPageContent) {
    const curBlock = `[PÁGINA ACTUAL EN PANTALLA (${currentPageLabel})]:\n${currentPageContent.slice(0, 4000)}\n`;
    selectedParts.push(curBlock);
    usedChars += curBlock.length;
  }

  // Add top ranked contextual matches across the entire book
  for (const chunk of ranked.slice(0, 8)) {
    if (usedChars + chunk.text.length > maxTotalChars) break;
    const block = `[FRAGMENTO RELEVANTE (${chunk.pageHint})]:\n${chunk.text}\n`;
    selectedParts.push(block);
    usedChars += block.length;
  }

  // If query had no keyword hits, provide opening + middle + recent sample
  if (ranked.length === 0 && usedChars < maxTotalChars - 3000) {
    const intro = fullContent.slice(0, 5000);
    const midStart = Math.floor(fullContent.length * 0.5);
    const mid = fullContent.slice(midStart, midStart + 4000);
    selectedParts.push(`[INICIO DEL LIBRO]:\n${intro}`);
    selectedParts.push(`[SECCIÓN CENTRAL DEL LIBRO]:\n${mid}`);
  }

  return selectedParts.join('\n---\n');
}

/**
 * Extracts a balanced slice for a specific section/batch (ideal for generating 80-question exams across 1000+ page books)
 */
export function extractBookSectionSlice(
  fullContent: string,
  sectionIndex: number,
  totalSections: number,
  maxChars = 14000
): { excerpt: string; rangeLabel: string } {
  if (fullContent.length <= maxChars) {
    return { excerpt: fullContent, rangeLabel: 'Obra completa' };
  }

  const segmentSize = Math.floor(fullContent.length / totalSections);
  const start = sectionIndex * segmentSize;
  const end = Math.min(fullContent.length, start + segmentSize);
  const segment = fullContent.slice(start, end);

  // If segment itself is larger than maxChars (e.g. a 1200-page book divided into 8 segments = ~350k chars/seg),
  // take 3 evenly spaced sub-samples inside this segment so every part of the chapter range is represented!
  let excerpt = '';
  if (segment.length <= maxChars) {
    excerpt = segment;
  } else {
    const subLen = Math.floor(maxChars / 3);
    const p1 = segment.slice(0, subLen);
    const p2Start = Math.floor(segment.length * 0.45);
    const p2 = segment.slice(p2Start, p2Start + subLen);
    const p3 = segment.slice(Math.max(0, segment.length - subLen));
    excerpt = `${p1}\n\n[...]\n\n${p2}\n\n[...]\n\n${p3}`;
  }

  // Detect page numbers if available
  const pageMatches = [...segment.matchAll(/---\s*Página\s+(\d+)\s*---/g)];
  let rangeLabel = `Sección ${sectionIndex + 1} de ${totalSections}`;
  if (pageMatches.length >= 2) {
    const firstP = pageMatches[0][1];
    const lastP = pageMatches[pageMatches.length - 1][1];
    rangeLabel = `Páginas ${firstP} – ${lastP}`;
  } else if (pageMatches.length === 1) {
    rangeLabel = `Alrededor de Página ${pageMatches[0][1]}`;
  }

  return { excerpt, rangeLabel };
}

/**
 * Creates a distributed multi-point sample across a 1000+ page book for Literary & Character Analysis
 */
export function sampleBookAcrossSections(fullContent: string, maxTotalChars = 24000): string {
  if (fullContent.length <= maxTotalChars) return fullContent;

  const numSamples = 5;
  const sampleSize = Math.floor(maxTotalChars / numSamples);
  const positions = [0, 0.22, 0.48, 0.74, 0.92];
  const parts: string[] = [];

  positions.forEach((ratio, idx) => {
    const start = Math.min(
      Math.max(0, fullContent.length - sampleSize),
      Math.floor(fullContent.length * ratio)
    );
    const slice = fullContent.slice(start, start + sampleSize);
    parts.push(`[MUESTRA ${idx + 1} (${Math.round(ratio * 100)}% del libro)]:\n${slice}`);
  });

  return parts.join('\n\n---\n\n');
}
