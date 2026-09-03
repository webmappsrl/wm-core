import {WmProperties} from '@wm-types/feature';

export interface DerivedPoiAddress {
  address: string;
  address_link: string;
}

/**
 * Derives display `address` and URL-safe `address_link` from POI properties.
 * Does not mutate the store — callers merge the result into a local view model.
 *
 * Precedence for `address`: existing non-empty `address` → `addr_complete` →
 * join(`addr_locality`, `addr_street`, ', ').
 * `address_link` uses the same source (spaces → `+` for single-string sources;
 * locality/street joined with `+`).
 */
/**
 * Drops empty segments from a comma-separated address: the backend emits values
 * like `",,"` or `",37013 Caprino Veronese VR,"` when only some address columns
 * are filled. Returns `''` when nothing but separators is left, so the caller
 * falls through to the next source instead of rendering an empty row.
 */
function cleanAddress(raw: string): string {
  return raw
    .split(',')
    .map(part => part.trim())
    .filter(part => part !== '')
    .join(', ');
}

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
