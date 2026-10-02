import {WmPassportStageDetailComponent} from './passport-stage-detail.component';

describe('WmPassportStageDetailComponent (oc:8676)', () => {
  const completed = {
    trackId: 203,
    name: {it: 'Cammino Grande di Celestino - Tappa 06: Pacentro - Caramanico Terme'},
    status: 'completed',
    distance: 19.5,
    source: 'manual',
    completedAt: '2026-09-30T14:45:55+00:00',
  } as any;
  const notStarted = {trackId: 215, name: {it: 'Tappa 11'}, status: 'not_started', distance: 0} as any;

  /** Il traduttore finto restituisce la chiave con i parametri sostituiti, come `wmtrans`. */
  function create(stage: any) {
    const lang = {
      currentLang: 'it',
      instant: (key: string, params?: any) => key.replace('{{date}}', params?.date ?? ''),
    };
    const cmp = new WmPassportStageDetailComponent(lang as any);
    cmp.stage = stage;
    return cmp;
  }

  it('tappa percorsa: chip con la data, come nel wireframe («percorsa il 30 set»)', () => {
    const cmp = create(completed);

    expect(cmp.done).toBeTrue();
    expect(cmp.chipLabel).toBe('percorsa il 30 set');
  });

  it('tappa non percorsa: chip senza data', () => {
    const cmp = create(notStarted);

    expect(cmp.done).toBeFalse();
    expect(cmp.chipLabel).toBe('non ancora percorsa');
  });

  it('la distanza si mostra solo se il dato c\'è', () => {
    expect(create(notStarted).showDistance).toBeFalse();
    expect(create(completed).showDistance).toBeTrue();
  });

  it('il nome è quello della lingua corrente', () => {
    expect(create(completed).title).toBe(
      'Cammino Grande di Celestino - Tappa 06: Pacentro - Caramanico Terme',
    );
  });
});
