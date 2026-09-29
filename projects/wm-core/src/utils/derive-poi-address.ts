import {WmProperties} from '@wm-types/feature';

export interface DerivedPoiAddress {
  address: string;
}

/**
 * Scarta i segmenti vuoti da un indirizzo separato da virgole: il backend manda valori come `",,"`
 * o `",37013 Caprino Veronese VR,"` quando solo alcune colonne dell'indirizzo sono compilate.
 * Restituisce `''` quando resta solo punteggiatura, così chi chiama passa alla sorgente
 * successiva invece di mostrare una riga vuota.
 */
function cleanAddress(raw: string): string {
  return raw
    .split(',')
    .map(part => part.trim())
    .filter(part => part !== '')
    .join(', ');
}

/**
 * Ricava dalle properties di un POI l'indirizzo da mostrare. **Non muta lo store**: chi chiama
 * unisce il risultato nel proprio view model.
 *
 * L'ordine di precedenza è: un `address` già valorizzato, poi `addr_complete`, poi `addr_locality`
 * e `addr_street` uniti da `, `.
 *
 * Restituiva anche un `address_link` con gli spazi sostituiti da `+`, pensato per finire nell'URL
 * di Google Maps. È stato tolto in oc:8406: chi costruisce quel link usa `encodeURIComponent`, che
 * trasforma quei `+` in `%2B` — un più letterale dentro l'indirizzo — quindi le due codifiche si
 * annullavano a vicenda e il link arrivava sbagliato.
 */
export function derivePoiAddress(
  props: WmProperties | null | undefined,
): DerivedPoiAddress {
  if (props == null) {
    return {address: ''};
  }

  const existing =
    typeof props.address === 'string' ? cleanAddress(props.address) : '';
  if (existing !== '') {
    return {address: existing};
  }

  const complete =
    typeof props.addr_complete === 'string' ? cleanAddress(props.addr_complete) : '';
  if (complete !== '') {
    return {address: complete};
  }

  const parts = [props.addr_locality, props.addr_street]
    .map(value => (typeof value === 'string' ? value.trim() : ''))
    .filter(part => part !== '');

  return {address: parts.join(', ')};
}
