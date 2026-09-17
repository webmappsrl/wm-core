import {WmProperties} from '@wm-types/feature';

export interface DerivedPoiAddress {
  address: string;
  address_link: string;
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
 * Ricava l'`address` da mostrare e l'`address_link` adatto a un URL dalle properties di un POI.
 * **Non muta lo store**: chi chiama unisce il risultato nel proprio view model.
 *
 * Per `address` l'ordine di precedenza e': un `address` già valorizzato, poi `addr_complete`, poi
 * `addr_locality` e `addr_street` uniti da `, `. `address_link` viene dalla stessa sorgente, ma
 * unito con `+`, che è la forma che finisce nell'URL di Google Maps.
 */
export function derivePoiAddress(
  props: WmProperties | null | undefined,
): DerivedPoiAddress {
  if (props == null) {
    return {address: '', address_link: ''};
  }

  const existing =
    typeof props.address === 'string' ? cleanAddress(props.address) : '';
  if (existing !== '') {
    return {address: existing, address_link: existing.replace(/\s+/g, '+')};
  }

  const complete =
    typeof props.addr_complete === 'string' ? cleanAddress(props.addr_complete) : '';
  if (complete !== '') {
    return {address: complete, address_link: complete.replace(/\s+/g, '+')};
  }

  const parts = [props.addr_locality, props.addr_street]
    .map(value => (typeof value === 'string' ? value.trim() : ''))
    .filter(part => part !== '');

  return {
    address: parts.join(', '),
    address_link: parts.join('+'),
  };
}
