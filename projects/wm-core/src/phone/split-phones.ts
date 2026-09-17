/**
 * Le etichette generiche che il backend infila dentro `contact_phone` — per esempio
 * `"Fixed Phone:+39 0341 481111,Cell Phone:,Other Phone:"`. Non dicono niente a chi legge, quindi
 * spariscono dal valore mostrato.
 *
 * I prefissi che invece portano informazione — `"Rifugio:"`, `"Mairie :"`, il nome di una persona
 * da chiamare — sono deliberatamente fuori da questo elenco: dicono all'utente chi sta per
 * chiamare. Per lo stesso motivo non c'è `fax`: un numero di fax etichettato va mostrato con la
 * sua etichetta, altrimenti sembra un numero di telefono qualunque.
 */
const GENERIC_PHONE_LABEL = /^\s*(fixed|cell|mobile|other|tel|telefono)\s*(phone)?\s*:\s*/i;

/**
 * Toglie il prefisso generico, ma solo quando nel prefisso non ci sono cifre: su un valore come
 * `"0124 442455; Paolo: 347 1932853"` il testo prima dei due punti è esso stesso un numero, e
 * tagliarlo perderebbe una linea vera.
 */
function stripGenericLabel(part: string): string {
  const [beforeColon] = part.split(':');
  if (/[0-9]/.test(beforeColon)) {
    return part;
  }
  return part.replace(GENERIC_PHONE_LABEL, '').trim();
}

/**
 * Divide la stringa CSV `contact_phone` in voci mostrabili: etichette generiche rimosse, e voci
 * senza nemmeno una cifra — `"Cell Phone:"` con dietro il vuoto — scartate del tutto invece di
 * diventare una riga vuota.
 */
export function splitPhones(raw: string | null | undefined): string[] {
  if (raw == null || typeof raw !== 'string') {
    return [];
  }
  return raw
    .split(',')
    .map(part => part.trim())
    .map(stripGenericLabel)
    .filter(part => part !== '' && /[0-9]/.test(part));
}

/**
 * Costruisce il corpo di un href `tel:` a partire dall'etichetta mostrata: solo cifre e `+`.
 */
export function telHref(label: string): string {
  return label.replace(/[^0-9+]/g, '');
}
