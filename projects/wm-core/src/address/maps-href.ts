/**
 * Costruisce il link di Google Maps a partire da un indirizzo.
 *
 * Sta in una funzione e non nel solo getter del componente perché lo stesso link serve anche ai
 * consumer: `wm-webapp` lo costruiva a mano nel ramo UGC del popup, con la stessa template string
 * copiata e senza spec. Un giorno che cambi la destinazione — Apple Maps, le coordinate al posto
 * dell'indirizzo, un parametro in più — le copie divergono e nessuno strumento lo segnala.
 *
 * Si parte da `address` e non dal vecchio `address_link`: quel campo univa con `+` per
 * pre-codificare gli spazi, ma `encodeURIComponent` trasformava poi quei `+` in `%2B`, cioè in un
 * più letterale dentro l'indirizzo. Le due codifiche si annullavano a vicenda (oc:8406).
 */
export function buildMapsHref(address: string | null | undefined): string {
  return `https://www.google.com/maps?daddr=${encodeURIComponent(address ?? '')}&navigate=yes`;
}
