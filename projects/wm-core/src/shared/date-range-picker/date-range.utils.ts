/**
 * Calendario a intervallo (oc:8169, ciclo 4): stato dei tocchi e testi, in funzioni pure. Le date sono
 * sempre stringhe `AAAA-MM-GG`, mai convertite in UTC.
 */

/** Intervallo di date; un giorno solo ha `start` uguale a `end`. */
export interface DateRange {
  start: string;
  end: string;
}

/** Quale estremo fissa il prossimo tocco. */
export type DateRangePicking = 'start' | 'end';

/**
 * Applica un tocco: il primo fissa l'inizio (un giorno), il secondo la fine (scambiando se viene prima;
 * lo stesso giorno chiude un intervallo di un giorno), il terzo ricomincia.
 *
 * @param current Intervallo corrente.
 * @param picking Estremo che il tocco fissa.
 * @param day Giorno toccato `AAAA-MM-GG`.
 * @returns Il nuovo intervallo e l'estremo del tocco successivo.
 */
export function nextRange(
  current: DateRange | null,
  picking: DateRangePicking,
  day: string,
): {range: DateRange; picking: DateRangePicking} {
  if (!current || picking === 'start') return {range: {start: day, end: day}, picking: 'end'};
  const [start, end] = day < current.start ? [day, current.start] : [current.start, day];
  return {range: {start, end}, picking: 'start'};
}

/**
 * Giorni strettamente compresi fra inizio e fine, per colorarli.
 *
 * @param range Intervallo.
 * @returns I giorni `AAAA-MM-GG`, estremi esclusi.
 */
export function daysBetween(range: DateRange): string[] {
  const days: string[] = [];
  const cursor = toDate(range.start);
  const end = toDate(range.end);
  cursor.setDate(cursor.getDate() + 1);
  while (cursor < end) {
    days.push(fromDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

/**
 * Testo del campo chiuso: «10 – 12 maggio 2026», «30 aprile – 2 maggio 2026», «30 dicembre 2025 –
 * 2 gennaio 2026», «10 maggio 2026».
 *
 * @param range Intervallo, `null` se vuoto.
 * @param locale Lingua per `Intl`.
 * @returns Il testo, vuoto se non c'è intervallo.
 */
export function formatDateRange(range: DateRange | null, locale: string): string {
  if (!range) return '';
  const a = parts(range.start, locale);
  const b = parts(range.end, locale);
  if (range.start === range.end) return `${a.day} ${a.month} ${a.year}`;
  if (a.year !== b.year) return `${a.day} ${a.month} ${a.year} – ${b.day} ${b.month} ${b.year}`;
  if (a.month !== b.month) return `${a.day} ${a.month} – ${b.day} ${b.month} ${b.year}`;
  return `${a.day} – ${b.day} ${b.month} ${b.year}`;
}

/**
 * Testo sotto il calendario, da tradurre: «Dal 10 maggio al 12 maggio» o «Solo il 10 maggio».
 *
 * @param range Intervallo.
 * @param locale Lingua per `Intl`.
 * @returns Chiave i18n e parametri.
 */
export function describeDateRange(
  range: DateRange,
  locale: string,
): {key: string; params: Record<string, string>} {
  const dayMonth = (iso: string) => {
    const p = parts(iso, locale);
    return `${p.day} ${p.month}`;
  };
  if (range.start === range.end) return {key: 'Solo il {{day}}', params: {day: dayMonth(range.start)}};
  return {key: 'Dal {{from}} al {{to}}', params: {from: dayMonth(range.start), to: dayMonth(range.end)}};
}

/**
 * @param iso Data `AAAA-MM-GG`.
 * @returns La data locale a mezzanotte, senza passare da UTC.
 */
function toDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * @param date Data locale.
 * @returns La data `AAAA-MM-GG` dai componenti locali.
 */
function fromDate(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/**
 * @param iso Data `AAAA-MM-GG`.
 * @param locale Lingua per `Intl`.
 * @returns Giorno, nome del mese e anno.
 */
function parts(iso: string, locale: string): {day: number; month: string; year: number} {
  const date = toDate(iso);
  return {
    day: date.getDate(),
    month: new Intl.DateTimeFormat(locale, {month: 'long'}).format(date),
    year: date.getFullYear(),
  };
}
