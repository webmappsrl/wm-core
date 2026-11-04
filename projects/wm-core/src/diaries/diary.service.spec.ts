import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {Store} from '@ngrx/store';
import {BehaviorSubject, combineLatest} from 'rxjs';
import {distinctUntilChanged, map} from 'rxjs/operators';
import {EnvironmentService} from '@wm-core/services/environment.service';
import {isLogged, user} from '@wm-core/store/auth/auth.selectors';
import {online} from '@wm-core/store/network/network.selector';
import {
  DIARIES_CACHE_MARKER,
  clearDiariesCache,
  synchronizedDiaries,
} from '@wm-core/utils/localForage';
import {Diary, DiariesStatus} from './diary.model';
import {DIARIES_RETRY_DELAY, DiaryService} from './diary.service';

describe('DiaryService (oc:8169)', () => {
  const ORIGIN = 'http://127.0.0.1:8000';
  const URL = `${ORIGIN}/api/diaries`;
  let logged$: BehaviorSubject<boolean>;
  let user$: BehaviorSubject<{id: number} | undefined>;
  let online$: BehaviorSubject<boolean>;
  /** Copia offline in memoria al posto di IndexedDB. */
  let cache: Map<string, unknown>;
  let httpMock: HttpTestingController;
  /** Service creati nel test: le loro code sulla copia offline si svuotano in `afterEach`. */
  let created: DiaryService[];

  /**
   * Store finto: applica il selettore a uno stato costruito da login, utente e rete.
   *
   * @returns Lo store con il solo `select`.
   */
  const fakeStore = () => ({
    select: (sel: (state: unknown) => unknown) =>
      combineLatest([logged$, user$, online$]).pipe(
        map(([logged, current, net]) => sel({auth: {isLogged: logged, user: current}, network: {online: net}})),
        distinctUntilChanged(),
      ),
  });

  /** Lascia completare le letture e scritture asincrone della copia offline. */
  const settle = () => new Promise(resolve => setTimeout(resolve));

  /**
   * Attende che la condizione diventi vera, entro un tetto: con la suite completa e la macchina
   * carica i timer reali e le code asincrone arrivano più tardi di quanto un'attesa fissa preveda.
   *
   * @param condition Condizione da attendere.
   * @param maxMs Tetto dell'attesa.
   */
  const until = async (condition: () => boolean, maxMs = 2000): Promise<void> => {
    const start = Date.now();
    while (!condition()) {
      if (Date.now() - start > maxMs) return;
      await new Promise(resolve => setTimeout(resolve, 5));
    }
  };

  const item = (id: number, layerId: number, trackId: number | null) => ({
    id,
    uuid: `u${id}`,
    layer: {id: layerId, name: `L${layerId}`},
    ec_track: trackId == null ? null : {id: trackId, name: `T${trackId}`},
    description: 'd',
    created_at: '2026-01-01',
    updated_at: '2026-01-02',
    photos: [{id: 1, url: 'u', thumbnail: 't'}],
    ugc_track_ids: [7],
  });

  function create(extraProviders: unknown[] = []): DiaryService {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {provide: Store, useValue: fakeStore()},
        {provide: EnvironmentService, useValue: {origin: ORIGIN}},
        ...(extraProviders as any[]),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const svc = TestBed.inject(DiaryService);
    created.push(svc);
    return svc;
  }

  beforeEach(() => {
    created = [];
    logged$ = new BehaviorSubject<boolean>(true);
    user$ = new BehaviorSubject<{id: number} | undefined>({id: 1});
    online$ = new BehaviorSubject<boolean>(true);
    cache = new Map();
    spyOn(synchronizedDiaries, 'getItem').and.callFake((async (key: string) =>
      cache.has(key) ? cache.get(key) : null) as any);
    spyOn(synchronizedDiaries, 'setItem').and.callFake((async (key: string, value: unknown) => {
      cache.set(key, value);
      return value;
    }) as any);
    spyOn(synchronizedDiaries, 'clear').and.callFake(async () => cache.clear());
    spyOn(synchronizedDiaries, 'removeItem').and.callFake((async (key: string) => {
      cache.delete(key);
    }) as any);
    localStorage.removeItem(DIARIES_CACHE_MARKER);
    // lo store finto applica i selettori veri: un override di MockStore lasciato da un altro spec
    // (setResult sul selettore memoizzato, che è globale) li fisserebbe
    [isLogged, user, online].forEach(sel => {
      sel.clearResult();
      sel.release();
    });
  });

  afterEach(async () => {
    // Le operazioni ancora in coda partirebbero dopo il test, senza più gli spy: sul localForage
    // vero, lente, e toglierebbero il marcatore mentre gira il test successivo.
    await Promise.all(created.map(svc => (svc as unknown as {_cacheQueue: Promise<void>})._cacheQueue));
    localStorage.removeItem(DIARIES_CACHE_MARKER);
  });

  it('nessuna GET finché nessuno si sottoscrive', () => {
    const svc = create();
    httpMock.expectNone(URL);
    const statuses: DiariesStatus[] = [];
    svc.status$().subscribe(s => statuses.push(s));
    expect(statuses).toEqual(['loading']);
    httpMock.expectOne(URL).flush({data: []});
    expect(statuses).toEqual(['loading', 'active']);
  });

  it('nessun controllo sullo shard: la GET parte con qualsiasi shardName', () => {
    const env = {origin: ORIGIN, shardName: 'geohub'};
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {provide: Store, useValue: fakeStore()},
        {provide: EnvironmentService, useValue: env},
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const svc = TestBed.inject(DiaryService);
    created.push(svc);
    let status: DiariesStatus | undefined;
    svc.status$().subscribe(s => (status = s));
    httpMock.expectOne(URL).flush({data: []});
    expect(status).toBe('active');
  });

  it('401 → login-required', () => {
    const svc = create();
    let status: DiariesStatus | undefined;
    svc.status$().subscribe(s => (status = s));
    httpMock.expectOne(URL).flush({}, {status: 401, statusText: 'Unauthorized'});
    expect(status).toBe('login-required');
  });

  it('non loggato + 404 → off (chiamata fatta comunque)', () => {
    logged$.next(false);
    const svc = create();
    let status: DiariesStatus | undefined;
    svc.status$().subscribe(s => (status = s));
    httpMock.expectOne(URL).flush({}, {status: 404, statusText: 'Not Found'});
    expect(status).toBe('off');
  });

  it('non loggato + 401 → login-required', () => {
    logged$.next(false);
    const svc = create();
    let status: DiariesStatus | undefined;
    svc.status$().subscribe(s => (status = s));
    httpMock.expectOne(URL).flush({}, {status: 401, statusText: 'Unauthorized'});
    expect(status).toBe('login-required');
  });

  it('refresh dopo un errore riattiva lo stato', async () => {
    const svc = create();
    let status: DiariesStatus | undefined;
    svc.status$().subscribe(s => (status = s));
    httpMock.expectOne(URL).flush({}, {status: 500, statusText: 'Err'});
    await settle();
    // un 5xx con la rete presente è `error`: si mostra la copia e si ritenta
    expect(status).toBe('error');
    svc.refresh();
    httpMock.expectOne(URL).flush({data: []});
    expect(status).toBe('active');
  });

  it('404 → off', () => {
    const svc = create();
    let status: DiariesStatus | undefined;
    svc.status$().subscribe(s => (status = s));
    httpMock.expectOne(URL).flush({}, {status: 404, statusText: 'Not Found'});
    expect(status).toBe('off');
  });

  it('200 → active, mappando il payload in camelCase', () => {
    const svc = create();
    let status: DiariesStatus | undefined;
    let list: Diary[] = [];
    svc.status$().subscribe(s => (status = s));
    svc.diaries$({}).subscribe(l => (list = l));
    httpMock.expectOne(URL).flush({data: [item(1, 3, 10)]});
    expect(status).toBe('active');
    expect(list[0].ecTrack).toEqual({id: 10, name: 'T10'});
    expect(list[0].ugcTrackIds).toEqual([7]);
    expect(list[0].createdAt).toBe('2026-01-01');
  });

  it('diaries$ del cammino include le tappe', () => {
    const svc = create();
    let byLayer: Diary[] = [];
    let byTrack: Diary[] = [];
    let byUgc: Diary[] = [];
    svc.diaries$({layerId: 3}).subscribe(l => (byLayer = l));
    svc.diaries$({ecTrackId: 11}).subscribe(l => (byTrack = l));
    svc.diaries$({ugcTrackId: 7}).subscribe(l => (byUgc = l));
    httpMock.expectOne(URL).flush({data: [item(1, 3, null), item(2, 3, 11), item(3, 4, 12)]});
    expect(byLayer.map(e => e.id)).toEqual([1, 2]);
    expect(byTrack.map(e => e.id)).toEqual([2]);
    expect(byUgc.length).toBe(3);
  });

  it('update invia keep_media_ids "[]" quando vuoto e rilegge', () => {
    const svc = create();
    svc.diaries$({}).subscribe();
    httpMock.expectOne(URL).flush({data: []});
    svc.update(5, {uuid: 'u5', description: 'x', newPhotos: []}).subscribe();
    const req = httpMock.expectOne(`${URL}/5`);
    expect(req.request.method).toBe('POST');
    expect((req.request.body as FormData).get('keep_media_ids')).toBe('[]');
    req.flush({data: item(5, 3, null)});
    httpMock.expectOne(URL).flush({data: []});
  });

  it('create invia uuid, layer_id, ec_track_id e images[]', () => {
    const svc = create();
    svc.diaries$({}).subscribe();
    httpMock.expectOne(URL).flush({data: []});
    svc
      .create({uuid: 'u1', layerId: 3, ecTrackId: 9, description: 'x', newPhotos: [new Blob(['a'], {type: 'image/jpeg'})]})
      .subscribe();
    const req = httpMock.expectOne({method: 'POST', url: URL});
    const body = req.request.body as FormData;
    expect(body.get('uuid')).toBe('u1');
    expect(body.get('layer_id')).toBe('3');
    expect(body.get('ec_track_id')).toBe('9');
    expect(body.getAll('images[]').length).toBe(1);
    expect((body.get('images[]') as File).name).toBe('photo-0.jpg');
    req.flush(item(1, 3, 9), {status: 201, statusText: 'Created'});
    httpMock.expectOne({method: 'GET', url: URL}).flush({data: [item(1, 3, 9)]});
  });

  it('create invia publication_consent=1 quando la spunta è attiva, 0 altrimenti', () => {
    const svc = create();
    svc.diaries$({}).subscribe();
    httpMock.expectOne(URL).flush({data: []});
    svc.create({uuid: 'u1', layerId: 3, description: 'x', newPhotos: [], publicationConsent: true}).subscribe();
    const req = httpMock.expectOne({method: 'POST', url: URL});
    expect((req.request.body as FormData).get('publication_consent')).toBe('1');
    req.flush(item(1, 3, null), {status: 201, statusText: 'Created'});
    httpMock.expectOne({method: 'GET', url: URL}).flush({data: []});
    svc.create({uuid: 'u2', layerId: 3, description: 'x', newPhotos: []}).subscribe();
    const req2 = httpMock.expectOne({method: 'POST', url: URL});
    expect((req2.request.body as FormData).get('publication_consent')).toBe('0');
    req2.flush(item(2, 3, null), {status: 201, statusText: 'Created'});
    httpMock.expectOne({method: 'GET', url: URL}).flush({data: []});
  });

  it('create invia le valutazioni, vuote quelle non date (oc:8169, ciclo 2)', () => {
    const svc = create();
    svc.diaries$({}).subscribe();
    httpMock.expectOne(URL).flush({data: []});
    svc.create({uuid: 'u1', layerId: 3, description: 'x', newPhotos: [], ratings: {route: 5, hospitality: null}}).subscribe();
    const req = httpMock.expectOne({method: 'POST', url: URL});
    const body = req.request.body as FormData;
    expect(body.get('rating_route')).toBe('5');
    expect(body.get('rating_hospitality')).toBe('');
    expect(body.get('rating_difficulty')).toBe('');
    req.flush(item(1, 3, null), {status: 201, statusText: 'Created'});
    httpMock.expectOne({method: 'GET', url: URL}).flush({data: []});
  });

  it('legge le valutazioni dalla risposta (oc:8169, ciclo 2)', () => {
    const svc = create();
    let list: Diary[] = [];
    svc.diaries$({}).subscribe(l => (list = l));
    httpMock.expectOne(URL).flush({data: [{...item(1, 3, null), rating_route: 4, rating_difficulty: 2}, item(2, 3, null)]});
    expect(list[0].ratings).toEqual({route: 4, hospitality: null, difficulty: 2});
    expect(list[1].ratings).toEqual({route: null, hospitality: null, difficulty: null});
  });

  it('legge publicationConsent dalla risposta', () => {
    const svc = create();
    let list: Diary[] = [];
    svc.diaries$({}).subscribe(l => (list = l));
    httpMock.expectOne(URL).flush({data: [{...item(1, 3, null), publication_consent: true}, item(2, 3, null)]});
    expect(list.map(d => d.publicationConsent)).toEqual([true, false]);
  });

  it('remove cancella e rilegge', () => {
    const svc = create();
    svc.diaries$({}).subscribe();
    httpMock.expectOne(URL).flush({data: [item(1, 3, null)]});
    let done = false;
    svc.remove(1).subscribe(() => (done = true));
    httpMock.expectOne({method: 'DELETE', url: `${URL}/1`}).flush(null, {status: 204, statusText: 'No Content'});
    expect(done).toBeTrue();
    httpMock.expectOne({method: 'GET', url: URL}).flush({data: []});
  });

  it('un nuovo montaggio dopo lo smontaggio non rifà la GET né torna in loading', () => {
    const svc = create();
    const first = svc.status$().subscribe();
    httpMock.expectOne(URL).flush({data: [item(1, 3, null)]});
    first.unsubscribe();
    const statuses: DiariesStatus[] = [];
    const second = svc.status$().subscribe(s => statuses.push(s));
    httpMock.expectNone(URL);
    expect(statuses).toEqual(['active']);
    second.unsubscribe();
  });

  it('logout svuota le esperienze', () => {
    const svc = create();
    let list: Diary[] = [];
    svc.diaries$({}).subscribe(l => (list = l));
    httpMock.expectOne(URL).flush({data: [item(1, 3, null)]});
    expect(list.length).toBe(1);
    logged$.next(false);
    expect(list).toEqual([]);
    httpMock.expectOne(URL).flush({}, {status: 401, statusText: 'Unauthorized'});
    expect(list).toEqual([]);
  });

  describe('offline', () => {
    const cached: Diary = {
      id: 9,
      uuid: 'u9',
      layer: {id: 3, name: 'L3'},
      ecTrack: null,
      description: 'salvata',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      photos: [],
      ugcTrackIds: [],
      publicationConsent: false,
    };

    it('rete «online» ma GET fallita (status 0) → error con la copia salvata', async () => {
      cache.set('mine:1', [cached]);
      const svc = create();
      let status: DiariesStatus | undefined;
      let list: Diary[] = [];
      let saved = false;
      svc.status$().subscribe(s => (status = s));
      svc.diaries$({layerId: 3}).subscribe(l => (list = l));
      svc.savedCopy$().subscribe(v => (saved = v));
      httpMock.expectOne(URL).error(new ProgressEvent('error'));
      await settle();
      expect(status).toBe('error');
      expect(saved).toBeTrue();
      expect(list.map(e => e.id)).toEqual([9]);
    });

    it('404 → off: la copia salvata non si mostra e si scarta', async () => {
      cache.set('mine:1', [cached]);
      const svc = create();
      let status: DiariesStatus | undefined;
      let list: Diary[] = [];
      svc.status$().subscribe(s => (status = s));
      svc.diaries$({}).subscribe(l => (list = l));
      // il marcatore subito prima della risposta: una pulizia asincrona rimasta da un altro spec
      // potrebbe toglierlo se messo all'inizio
      localStorage.setItem(DIARIES_CACHE_MARKER, '1');
      httpMock.expectOne(URL).flush({}, {status: 404, statusText: 'Not Found'});
      await until(() => cache.size === 0);
      expect(status).toBe('off');
      expect(list).toEqual([]);
      expect(cache.size).toBe(0);
    });

    it('rete assente e nessuna copia: offline senza copia, nessuna GET', async () => {
      online$.next(false);
      const svc = create();
      let status: DiariesStatus | undefined;
      let saved = true;
      svc.status$().subscribe(s => (status = s));
      svc.savedCopy$().subscribe(v => (saved = v));
      await settle();
      httpMock.expectNone(URL);
      expect(status).toBe('offline');
      expect(saved).toBeFalse();
    });

    it('la GET riuscita salva la lista mine sotto la chiave dell\'utente', async () => {
      const svc = create();
      svc.status$().subscribe();
      httpMock.expectOne(URL).flush({data: [item(1, 3, null)]});
      await settle();
      expect(synchronizedDiaries.setItem).toHaveBeenCalledTimes(1);
      expect((cache.get('mine:1') as Diary[]).map(e => e.id)).toEqual([1]);
    });

    it('da non loggato non salva nulla', async () => {
      logged$.next(false);
      user$.next(undefined);
      const svc = create();
      svc.status$().subscribe();
      httpMock.expectOne(URL).flush({data: [item(1, 3, null)]});
      await settle();
      expect(synchronizedDiaries.setItem).not.toHaveBeenCalled();
    });

    it('logout e cambio d\'utente svuotano la copia salvata', async () => {
      const svc = create();
      svc.status$().subscribe();
      httpMock.expectOne(URL).flush({data: [item(1, 3, null)]});
      await until(() => cache.has('mine:1'));
      expect(cache.has('mine:1')).toBeTrue();
      user$.next({id: 2});
      httpMock.expectOne(URL).flush({data: []});
      // la coda della copia è in serie: la lista dell'utente 2 si scrive dopo la pulizia
      await until(() => cache.has('mine:2'));
      expect(synchronizedDiaries.clear).toHaveBeenCalledTimes(1);
      logged$.next(false);
      user$.next(undefined);
      httpMock.expectOne(URL).flush({}, {status: 401, statusText: 'Unauthorized'});
      const clear = synchronizedDiaries.clear as jasmine.Spy;
      await until(() => clear.calls.count() === 2 && cache.size === 0);
      expect(synchronizedDiaries.clear).toHaveBeenCalledTimes(2);
      expect(cache.size).toBe(0);
    });

    it('al ritorno della rete rilegge da sola', async () => {
      const svc = create();
      let status: DiariesStatus | undefined;
      svc.status$().subscribe(s => (status = s));
      httpMock.expectOne(URL).flush({data: [item(1, 3, null)]});
      online$.next(false);
      await settle();
      httpMock.expectNone(URL);
      expect(status).toBe('offline');
      online$.next(true);
      httpMock.expectOne(URL).flush({data: [item(1, 3, null)]});
      expect(status).toBe('active');
    });

    it('rete assente con la copia salvata → offline (non error)', async () => {
      cache.set('mine:1', [cached]);
      online$.next(false);
      const svc = create();
      let status: DiariesStatus | undefined;
      let saved = false;
      svc.status$().subscribe(s => (status = s));
      svc.savedCopy$().subscribe(v => (saved = v));
      await settle();
      httpMock.expectNone(URL);
      expect(status).toBe('offline');
      expect(saved).toBeTrue();
    });

    it('GET fallita con la rete presente: ritenta da sola dopo il ritardo, una volta', async () => {
      const svc = create([{provide: DIARIES_RETRY_DELAY, useValue: 20}]);
      let status: DiariesStatus | undefined;
      svc.status$().subscribe(s => (status = s));
      httpMock.expectOne(URL).flush({}, {status: 503, statusText: 'Unavailable'});
      await settle();
      expect(status).toBe('error');
      httpMock.expectNone(URL);
      await new Promise(resolve => setTimeout(resolve, 40));
      httpMock.expectOne(URL).flush({data: [item(1, 3, null)]});
      expect(status).toBe('active');
      await new Promise(resolve => setTimeout(resolve, 40));
      httpMock.expectNone(URL);
    });

    it('senza marcatore la pulizia non tocca localForage', async () => {
      await clearDiariesCache();
      expect(synchronizedDiaries.clear).not.toHaveBeenCalled();
      localStorage.setItem(DIARIES_CACHE_MARKER, '1');
      await clearDiariesCache();
      expect(synchronizedDiaries.clear).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem(DIARIES_CACHE_MARKER)).toBeNull();
    });

    it('la scrittura della GET mette il marcatore', async () => {
      const svc = create();
      svc.status$().subscribe();
      httpMock.expectOne(URL).flush({data: []});
      await settle();
      expect(localStorage.getItem(DIARIES_CACHE_MARKER)).toBe('1');
    });

    it('utente cambiato mentre la copia si scrive: la chiave scritta si toglie', async () => {
      let release!: () => void;
      (synchronizedDiaries.setItem as jasmine.Spy).and.callFake((async (key: string, value: unknown) => {
        await new Promise<void>(resolve => (release = resolve));
        cache.set(key, value);
        return value;
      }) as any);
      const svc = create();
      svc.status$().subscribe();
      httpMock.expectOne(URL).flush({data: [item(1, 3, null)]});
      await settle();
      logged$.next(false);
      user$.next(undefined);
      httpMock.expectOne(URL).flush({}, {status: 401, statusText: 'Unauthorized'});
      release();
      await settle();
      expect(synchronizedDiaries.removeItem).toHaveBeenCalledWith('mine:1');
      expect(cache.has('mine:1')).toBeFalse();
    });

    it('modifica e cancellazione aggiornano subito la copia, prima della GET', async () => {
      const svc = create();
      svc.status$().subscribe();
      httpMock.expectOne(URL).flush({data: [item(1, 3, null), item(2, 3, null)]});
      await settle();
      svc.update(1, {uuid: 'u1', description: 'nuova', newPhotos: []}).subscribe();
      httpMock.expectOne(`${URL}/1`).flush({data: {...item(1, 3, null), description: 'nuova'}});
      const reload = httpMock.expectOne({method: 'GET', url: URL});
      await settle();
      const afterUpdate = cache.get('mine:1') as Diary[];
      expect(afterUpdate.find(e => e.id === 1)?.description).toBe('nuova');
      reload.flush({data: [{...item(1, 3, null), description: 'nuova'}, item(2, 3, null)]});
      await settle();
      svc.remove(2).subscribe();
      httpMock.expectOne({method: 'DELETE', url: `${URL}/2`}).flush(null, {status: 204, statusText: 'No Content'});
      const reload2 = httpMock.expectOne({method: 'GET', url: URL});
      await settle();
      expect((cache.get('mine:1') as Diary[]).map(e => e.id)).toEqual([1]);
      reload2.flush({data: [item(1, 3, null)]});
    });

    it('la creazione aggiunge subito l\'esperienza alla copia', async () => {
      const svc = create();
      svc.status$().subscribe();
      httpMock.expectOne(URL).flush({data: [item(1, 3, null)]});
      await settle();
      svc.create({uuid: 'u7', layerId: 3, description: 'x', newPhotos: []}).subscribe();
      httpMock.expectOne({method: 'POST', url: URL}).flush(item(7, 3, null));
      const reload = httpMock.expectOne({method: 'GET', url: URL});
      await settle();
      expect((cache.get('mine:1') as Diary[]).map(e => e.id)).toEqual([7, 1]);
      reload.flush({data: [item(7, 3, null), item(1, 3, null)]});
    });

    it('al massimo 3 tentativi automatici, con attesa che raddoppia; «Riprova» riparte da zero', async () => {
      const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      const svc = create([{provide: DIARIES_RETRY_DELAY, useValue: 40}]);
      let status: DiariesStatus | undefined;
      svc.status$().subscribe(s => (status = s));
      const pending = () => httpMock.match(URL);
      // il tentativo arriva quando arriva: si aspetta la richiesta, non un numero di millisecondi
      const nextRequest = async () => {
        let found = pending();
        await until(() => found.length > 0 || (found = pending()).length > 0);
        expect(found.length).withContext('tentativo atteso').toBe(1);
        return found[0];
      };
      const fail = async () =>
        (await nextRequest()).flush({}, {status: 500, statusText: 'Err'});
      await fail();
      // tre tentativi automatici (dopo 40, 80 e 160 ms): nessuno parte subito
      for (let i = 0; i < 3; i++) {
        await settle();
        httpMock.expectNone(URL);
        await fail();
      }
      // nessun quarto tentativo (arriverebbe dopo 320 ms)
      await wait(500);
      httpMock.expectNone(URL);
      expect(status).toBe('error');
      svc.refresh();
      await fail();
      // contatore azzerato: riparte il primo tentativo automatico
      (await nextRequest()).flush({data: []});
      expect(status).toBe('active');
    });
  });
});
