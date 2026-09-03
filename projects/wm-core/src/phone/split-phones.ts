/**
 * Generic phone labels the backend embeds in `contact_phone` (e.g.
 * `"Fixed Phone:+39 0341 481111,Cell Phone:,Other Phone:"`). They carry no
 * information for the reader, so they are stripped from the displayed value.
 *
 * Meaningful prefixes (`"Rifugio:"`, `"Mairie :"`, a contact person's name) are
 * deliberately NOT listed here: they tell the user who they are about to call.
 */
const GENERIC_PHONE_LABEL = /^\s*(fixed|cell|mobile|other|tel|telefono|fax)\s*(phone)?\s*:\s*/i;

/**
 * Strips a generic label prefix, but only when the prefix holds no digits — on
 * values like `"0124 442455; Paolo: 347 1932853"` the text before the colon is
 * itself a phone number and must survive.
 */
function stripGenericLabel(part: string): string {
  const [beforeColon] = part.split(':');
  if (/[0-9]/.test(beforeColon)) {
    return part;
  }
  return part.replace(GENERIC_PHONE_LABEL, '').trim();
}

/**
 * Splits a CSV `contact_phone` string into displayable entries: generic labels
 * removed, and entries carrying no digit at all (`"Cell Phone:"` with no number
 * behind it) dropped entirely rather than rendered as an empty row.
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
 * Builds a `tel:` href body from a display label (digits and `+` only).
 */
export function telHref(label: string): string {
  return label.replace(/[^0-9+]/g, '');
}
