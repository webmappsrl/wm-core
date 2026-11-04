/**
 * Testo del diario (oc:8169, ciclo 3): `description` è sempre HTML, scritto dall'editor e ripulito dal
 * backend. Qui estratti, conteggi e collegamenti, senza regole per riconoscere il formato.
 */

/** Caratteri di testo visibile ammessi, come nel backend. */
export const DIARY_MAX_VISIBLE = 20000;

/** Blocchi che nell'estratto e nel testo semplice vanno separati. */
const BLOCKS = 'p, h1, h2, h3, h4, h5, h6, li, blockquote';

/** Schemi ammessi per i collegamenti. */
const LINK_SCHEME = /^(https?:\/\/|mailto:)/i;

/** Uno schema qualsiasi (`xxx:`), per riconoscere quelli non ammessi. */
const ANY_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Toglie i paragrafi vuoti in fondo: l'editor ne tiene sempre uno dopo un elenco o una citazione,
 * per poter continuare a scrivere.
 *
 * @param html HTML dell'editor.
 * @returns L'HTML senza paragrafi vuoti finali, vuoto se non resta niente.
 */
export function trimDiaryHtml(html: string): string {
  return html.replace(/(<p>(\s|<br[^>]*>)*<\/p>)+$/i, '');
}

/**
 * Estratto per le schede, senza formattazione.
 *
 * @param html Racconto.
 * @returns Il testo su una riga.
 */
export function diaryTextExcerpt(html: string | null | undefined): string {
  return blockTexts(html).join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Caratteri di testo visibile, per il contatore e il limite.
 *
 * @param html Racconto.
 * @returns Il numero di caratteri senza tag.
 */
export function diaryVisibleLength(html: string | null | undefined): number {
  if (!html) return 0;
  return (parse(html).body.textContent ?? '').trim().length;
}

/**
 * Testo semplice per la casella di ripiego: blocchi separati da una riga vuota, a capo conservati.
 *
 * @param html Racconto.
 * @returns Il testo semplice.
 */
export function diaryPlainText(html: string | null | undefined): string {
  return blockTexts(html, true).join('\n\n').trim();
}

/**
 * Normalizza l'indirizzo di un collegamento: senza schema diventa `https://`.
 *
 * @param url Indirizzo scritto dall'utente.
 * @returns L'indirizzo, `null` se vuoto o con uno schema non ammesso.
 */
export function normalizeDiaryLink(url: string): string | null {
  const value = url.trim();
  if (!value) return null;
  if (LINK_SCHEME.test(value)) return value;
  if (ANY_SCHEME.test(value)) return null;
  return `https://${value.replace(/^\/+/, '')}`;
}

/**
 * @param html Racconto.
 * @returns Il documento.
 */
function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

/**
 * Testi dei blocchi, nell'ordine.
 *
 * @param html Racconto.
 * @param keepBreaks Se `<br>` diventa un a capo.
 * @returns Un testo per blocco, senza quelli vuoti.
 */
function blockTexts(html: string | null | undefined, keepBreaks = false): string[] {
  if (!html) return [];
  const doc = parse(html);
  if (keepBreaks) doc.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
  // un blocco contenuto in un altro (paragrafo dentro un elemento di elenco) conta una volta sola
  const blocks = Array.from(doc.body.querySelectorAll(BLOCKS)).filter(el => !el.querySelector(BLOCKS));
  const texts = blocks.length > 0 ? blocks.map(el => el.textContent ?? '') : [doc.body.textContent ?? ''];
  return texts.map(t => t.trim()).filter(t => t.length > 0);
}
