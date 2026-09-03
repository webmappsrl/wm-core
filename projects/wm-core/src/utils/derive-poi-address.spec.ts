import {WmProperties} from '@wm-types/feature';

import {derivePoiAddress} from './derive-poi-address';

describe('derivePoiAddress (oc:8406)', () => {
  it('usa addr_complete per address e address_link', () => {
    const props = {
      addr_complete: 'Via Roma 1, Pisa',
      addr_locality: 'Pisa',
      addr_street: 'Via Roma 1',
    } as unknown as WmProperties;

    expect(derivePoiAddress(props)).toEqual({
      address: 'Via Roma 1, Pisa',
      address_link: 'Via+Roma+1,+Pisa',
    });
  });

  it('con solo locality e street fa join con virgola e plus', () => {
    const props = {
      addr_locality: 'Pisa',
      addr_street: 'Via Roma 1',
    } as unknown as WmProperties;

    expect(derivePoiAddress(props)).toEqual({
      address: 'Pisa, Via Roma 1',
      address_link: 'Pisa+Via Roma 1',
    });
  });

  it('un address già valorizzato vince su addr_*', () => {
    const props = {
      address: 'Indirizzo backend',
      addr_complete: 'Da ignorare',
      addr_locality: 'Pisa',
      addr_street: 'Via Roma',
    } as unknown as WmProperties;

    expect(derivePoiAddress(props)).toEqual({
      address: 'Indirizzo backend',
      address_link: 'Indirizzo+backend',
    });
  });

  it('con null/undefined restituisce stringhe vuote', () => {
    expect(derivePoiAddress(null)).toEqual({address: '', address_link: ''});
    expect(derivePoiAddress(undefined)).toEqual({address: '', address_link: ''});
  });

  it('scarta i segmenti vuoti degli indirizzi sporchi del backend', () => {
    // Valori reali su db_prod: 82 POI con sole virgole, 522 con virgole ai bordi
    expect(derivePoiAddress({addr_complete: ',,'} as any).address).toBe('');
    expect(derivePoiAddress({addr_complete: ',37013 Caprino Veronese VR,'} as any).address).toBe(
      '37013 Caprino Veronese VR',
    );
    expect(derivePoiAddress({addr_complete: 'Piazza Diaz 1,23900 Lecco'} as any).address).toBe(
      'Piazza Diaz 1, 23900 Lecco',
    );
  });

  it('un addr_complete di sole virgole non blocca il fallback su locality/street', () => {
    const result = derivePoiAddress({
      addr_complete: ',,',
      addr_locality: 'Lecco',
      addr_street: 'Piazza Diaz 1',
    } as any);
    expect(result.address).toBe('Lecco, Piazza Diaz 1');
  });
});
