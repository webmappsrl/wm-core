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
 * Separa i numeri dentro una stessa voce: il punto e virgola, i due punti di un'etichetta
 * parlante e due o più spazi consecutivi. Il singolo spazio no, perché separa i gruppi di uno
 * stesso numero (`"+39 0543 965314"`).
 */
const NUMBER_SEPARATOR = /[;:]|\s{2,}/;

/** Sotto questa soglia di cifre un frammento è un'etichetta, non un numero (`"Rifugio 2"`). */
const MIN_DIGITS = 4;

/**
 * `+39`, `+1`, `+352`: un frammento così è un prefisso internazionale, non un numero. Al massimo
 * tre cifre, perché i prefissi ITU-T E.164 non vanno oltre — quattro allargava la finestra senza
 * motivo, e un frammento di quattro cifre è già un numero corto.
 */
const INTERNATIONAL_PREFIX = /^\+[0-9]{1,3}$/;

/**
 * Costruisce il corpo di un href `tel:` a partire dall'etichetta mostrata: solo cifre e `+`.
 *
 * Quando la voce ne contiene più d'uno prende **il primo**. `splitPhones` divide solo sulla
 * virgola, quindi conserva di proposito voci come `"0124 442455; Paolo: 347 1932853"` — reale, e
 * pinnato negli spec — dove i numeri sono due. Togliendo tutto tranne cifre e `+` sull'intera
 * etichetta usciva `tel:01244424553471932853`, cioè la loro concatenazione: un numero che non
 * esiste, e il tap apriva il dialer su quello. L'etichetta mostrata resta invece intera, perché
 * all'utente serve vedere entrambi.
 */
export function telHref(label: string): string {
  if (label == null || typeof label !== 'string') {
    return '';
  }
  let prefix = '';
  for (const fragment of label.split(NUMBER_SEPARATOR)) {
    const digitsOnly = fragment.replace(/[^0-9+]/g, '');
    if ((digitsOnly.match(/[0-9]/g) ?? []).length >= MIN_DIGITS) {
      return prefix + digitsOnly;
    }
    // Un frammento che è solo il prefisso internazionale non basta da sé, ma non va nemmeno
    // buttato: `"+39  0341 481111"`, con due spazi, si divide proprio lì e senza questo il
    // numero uscirebbe senza `+39`. Chiamato dall'Italia funziona lo stesso, dall'estero no.
    prefix = INTERNATIONAL_PREFIX.test(digitsOnly) ? digitsOnly : '';
  }
  // Nessun frammento abbastanza lungo: si torna al comportamento di prima invece di restituire
  // niente, così un numero corto o in una forma che non prevediamo resta comunque chiamabile.
  return label.replace(/[^0-9+]/g, '');
}
