import {deviceDiaryDrafts} from '@wm-core/utils/localForage';
import {DiaryDraftStore, StoredDiaryDraft, diaryDraftKey} from './diary-draft.store';

/** Bozza del form del diario salvata sul telefono (oc:8169, ciclo 2). */
describe('DiaryDraftStore (oc:8169)', () => {
  const DAY = 24 * 60 * 60 * 1000;
  let store: DiaryDraftStore;

  const draft = (key: string, updatedAt: number): StoredDiaryDraft => ({
    key,
    userId: 5,
    uuid: 'uuid-1',
    layerId: 3,
    description: 'ciao',
    photos: [new Blob(['a'], {type: 'image/jpeg'})],
    publicationConsent: true,
    updatedAt,
  });

  beforeEach(async () => {
    await deviceDiaryDrafts.clear();
    store = new DiaryDraftStore();
  });

  afterEach(async () => {
    await deviceDiaryDrafts.clear();
  });

  it('diaryDraftKey distingue cammino, tappa e modifica', () => {
    const keys = [
      diaryDraftKey(5, {layerId: 3}),
      diaryDraftKey(5, {layerId: 3, ecTrackId: 9}),
      diaryDraftKey(5, {layerId: 3, diaryId: 12}),
    ];
    expect(new Set(keys).size).toBe(3);
    expect(diaryDraftKey(5, {layerId: 3})).toBe('u5:l3:t0');
    expect(diaryDraftKey(5, {layerId: 3, ecTrackId: 9})).toBe('u5:l3:t9');
    expect(diaryDraftKey(5, {layerId: 3, diaryId: 12})).toBe('u5:d12');
  });

  it('save e load ritrovano testo, foto, uuid e consenso', async () => {
    await store.save(draft('u5:l3:t0', Date.now()));
    const loaded = await store.load('u5:l3:t0');
    expect(loaded.description).toBe('ciao');
    expect(loaded.uuid).toBe('uuid-1');
    expect(loaded.publicationConsent).toBeTrue();
    expect(loaded.photos.length).toBe(1);
    expect(loaded.photos[0] instanceof Blob).toBeTrue();
  });

  it('load di una chiave mai salvata restituisce null', async () => {
    expect(await store.load('u5:l99:t0')).toBeNull();
  });

  it('remove cancella la bozza', async () => {
    await store.save(draft('u5:l3:t0', Date.now()));
    await store.remove('u5:l3:t0');
    expect(await store.load('u5:l3:t0')).toBeNull();
  });

  it('purgeOlderThan(90) cancella le bozze di 91 giorni e tiene quelle di 89', async () => {
    const now = Date.now();
    await store.save(draft('u5:l1:t0', now - 91 * DAY));
    await store.save(draft('u5:l2:t0', now - 89 * DAY));
    expect(await store.purgeOlderThan(90, now)).toBe(1);
    expect(await store.load('u5:l1:t0')).toBeNull();
    expect(await store.load('u5:l2:t0')).not.toBeNull();
  });
});
