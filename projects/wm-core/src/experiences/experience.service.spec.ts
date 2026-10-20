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
  EXPERIENCES_CACHE_MARKER,
  clearExperiencesCache,
  synchronizedExperiences,
} from '@wm-core/utils/localForage';
import {Experience, ExperiencesStatus} from './experience.model';
import {EXPERIENCES_RETRY_DELAY, ExperienceService} from './experience.service';

describe('ExperienceService (oc:8169)', () => {
  const ORIGIN = 'http://127.0.0.1:8000';
  const URL = `${ORIGIN}/api/experiences`;
  let logged$: BehaviorSubject<boolean>;
  let user$: BehaviorSubject<{id: number} | undefined>;
  let online$: BehaviorSubject<boolean>;
  /** Copia offline in memoria al posto di IndexedDB. */
  let cache: Map<string, unknown>;
  let httpMock: HttpTestingController;

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

  function create(extraProviders: unknown[] = []): ExperienceService {
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
    return TestBed.inject(ExperienceService);
  }

  beforeEach(() => {
    logged$ = new BehaviorSubject<boolean>(true);
    user$ = new BehaviorSubject<{id: number} | undefined>({id: 1});
    online$ = new BehaviorSubject<boolean>(true);
    cache = new Map();
    spyOn(synchronizedExperiences, 'getItem').and.callFake((async (key: string) =>
      cache.has(key) ? cache.get(key) : null) as any);
    spyOn(synchronizedExperiences, 'setItem').and.callFake((async (key: string, value: unknown) => {
      cache.set(key, value);
      return value;
    }) as any);
    spyOn(synchronizedExperiences, 'clear').and.callFake(async () => cache.clear());
    spyOn(synchronizedExperiences, 'removeItem').and.callFake((async (key: string) => {
      cache.delete(key);
    }) as any);
    localStorage.removeItem(EXPERIENCES_CACHE_MARKER);
    // lo store finto applica i selettori veri: un override di MockStore lasciato da un altro spec
    // (setResult sul selettore memoizzato, che è globale) li fisserebbe
    [isLogged, user, online].forEach(sel => {
      sel.clearResult();
      sel.release();
    });
  });

  afterEach(() => localStorage.removeItem(EXPERIENCES_CACHE_MARKER));

  it('nessuna GET finché nessuno si sottoscrive', () => {
    const svc = create();
    httpMock.expectNone(URL);
    const statuses: ExperiencesStatus[] = [];
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
    const svc = TestBed.inject(ExperienceService);
    let status: ExperiencesStatus | undefined;
    svc.status$().subscribe(s => (status = s));
    httpMock.expectOne(URL).flush({data: []});
    expect(status).toBe('active');
  });

  it('401 → login-required', () => {
    const svc = create();
    let status: ExperiencesStatus | undefined;
    svc.status$().subscribe(s => (status = s));
    httpMock.expectOne(URL).flush({}, {status: 401, statusText: 'Unauthorized'});
    expect(status).toBe('login-required');
  });

  it('non loggato + 404 → off (chiamata fatta comunque)', () => {
    logged$.next(false);
    const svc = create();
    let status: ExperiencesStatus | undefined;
    svc.status$().subscribe(s => (status = s));
    httpMock.expectOne(URL).flush({}, {status: 404, statusText: 'Not Found'});
    expect(status).toBe('off');
  });

  it('non loggato + 401 → login-required', () => {
    logged$.next(false);
    const svc = create();
    let status: ExperiencesStatus | undefined;
    svc.status$().subscribe(s => (status = s));
    httpMock.expectOne(URL).flush({}, {status: 401, statusText: 'Unauthorized'});
    expect(status).toBe('login-required');
  });

  it('refresh dopo un errore riattiva lo stato', async () => {
    const svc = create();
    let status: ExperiencesStatus | undefined;
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
    let status: ExperiencesStatus | undefined;
    svc.status$().subscribe(s => (status = s));
    httpMock.expectOne(URL).flush({}, {status: 404, statusText: 'Not Found'});
    expect(status).toBe('off');
  });

  it('200 → active, mappando il payload in camelCase', () => {
    const svc = create();
    let status: ExperiencesStatus | undefined;
    let list: Experience[] = [];
    svc.status$().subscribe(s => (status = s));
    svc.experiences$({}).subscribe(l => (list = l));
    httpMock.expectOne(URL).flush({data: [item(1, 3, 10)]});
    expect(status).toBe('active');
    expect(list[0].ecTrack).toEqual({id: 10, name: 'T10'});
    expect(list[0].ugcTrackIds).toEqual([7]);
    expect(list[0].createdAt).toBe('2026-01-01');
  });

  it('experiences$ del cammino include le tappe', () => {
    const svc = create();
    let byLayer: Experience[] = [];
    let byTrack: Experience[] = [];
    let byUgc: Experience[] = [];
    svc.experiences$({layerId: 3}).subscribe(l => (byLayer = l));
    svc.experiences$({ecTrackId: 11}).subscribe(l => (byTrack = l));
    svc.experiences$({ugcTrackId: 7}).subscribe(l => (byUgc = l));
    httpMock.expectOne(URL).flush({data: [item(1, 3, null), item(2, 3, 11), item(3, 4, 12)]});
    expect(byLayer.map(e => e.id)).toEqual([1, 2]);
    expect(byTrack.map(e => e.id)).toEqual([2]);
    expect(byUgc.length).toBe(3);
  });

  it('update invia keep_media_ids "[]" quando vuoto e rilegge', () => {
    const svc = create();
    svc.experiences$({}).subscribe();
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
    svc.experiences$({}).subscribe();
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

  it('remove cancella e rilegge', () => {
    const svc = create();
    svc.experiences$({}).subscribe();
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
    const statuses: ExperiencesStatus[] = [];
    const second = svc.status$().subscribe(s => statuses.push(s));
    httpMock.expectNone(URL);
    expect(statuses).toEqual(['active']);
    second.unsubscribe();
  });

  it('logout svuota le esperienze', () => {
    const svc = create();
    let list: Experience[] = [];
    svc.experiences$({}).subscribe(l => (list = l));
    httpMock.expectOne(URL).flush({data: [item(1, 3, null)]});
    expect(list.length).toBe(1);
    logged$.next(false);
    expect(list).toEqual([]);
    httpMock.expectOne(URL).flush({}, {status: 401, statusText: 'Unauthorized'});
    expect(list).toEqual([]);
  });

  describe('offline', () => {
    const cached: Experience = {
      id: 9,
      uuid: 'u9',
      layer: {id: 3, name: 'L3'},
      ecTrack: null,
      description: 'salvata',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      photos: [],
      ugcTrackIds: [],
    };

    it('rete «online» ma GET fallita (status 0) → error con la copia salvata', async () => {
      cache.set('mine:1', [cached]);
      const svc = create();
      let status: ExperiencesStatus | undefined;
      let list: Experience[] = [];
      let saved = false;
      svc.status$().subscribe(s => (status = s));
      svc.experiences$({layerId: 3}).subscribe(l => (list = l));
      svc.savedCopy$().subscribe(v => (saved = v));
      httpMock.expectOne(URL).error(new ProgressEvent('error'));
      await settle();
      expect(status).toBe('error');
      expect(saved).toBeTrue();
      expect(list.map(e => e.id)).toEqual([9]);
    });

    it('404 → off: la copia salvata non si mostra e si scarta', async () => {
      cache.set('mine:1', [cached]);
      localStorage.setItem(EXPERIENCES_CACHE_MARKER, '1');
      const svc = create();
      let status: ExperiencesStatus | undefined;
      let list: Experience[] = [];
      svc.status$().subscribe(s => (status = s));
      svc.experiences$({}).subscribe(l => (list = l));
      httpMock.expectOne(URL).flush({}, {status: 404, statusText: 'Not Found'});
      await settle();
      expect(status).toBe('off');
      expect(list).toEqual([]);
      expect(cache.size).toBe(0);
    });

    it('rete assente e nessuna copia: offline senza copia, nessuna GET', async () => {
      online$.next(false);
      const svc = create();
      let status: ExperiencesStatus | undefined;
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
      expect(synchronizedExperiences.setItem).toHaveBeenCalledTimes(1);
      expect((cache.get('mine:1') as Experience[]).map(e => e.id)).toEqual([1]);
    });

    it('da non loggato non salva nulla', async () => {
      logged$.next(false);
      user$.next(undefined);
      const svc = create();
      svc.status$().subscribe();
      httpMock.expectOne(URL).flush({data: [item(1, 3, null)]});
      await settle();
      expect(synchronizedExperiences.setItem).not.toHaveBeenCalled();
    });

    it('logout e cambio d\'utente svuotano la copia salvata', async () => {
      const svc = create();
      svc.status$().subscribe();
      httpMock.expectOne(URL).flush({data: [item(1, 3, null)]});
      await settle();
      expect(cache.has('mine:1')).toBeTrue();
      user$.next({id: 2});
      httpMock.expectOne(URL).flush({data: []});
      await settle();
      expect(synchronizedExperiences.clear).toHaveBeenCalledTimes(1);
      logged$.next(false);
      user$.next(undefined);
      httpMock.expectOne(URL).flush({}, {status: 401, statusText: 'Unauthorized'});
      await settle();
      expect(synchronizedExperiences.clear).toHaveBeenCalledTimes(2);
      expect(cache.size).toBe(0);
    });

    it('al ritorno della rete rilegge da sola', async () => {
      const svc = create();
      let status: ExperiencesStatus | undefined;
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
      let status: ExperiencesStatus | undefined;
      let saved = false;
      svc.status$().subscribe(s => (status = s));
      svc.savedCopy$().subscribe(v => (saved = v));
      await settle();
      httpMock.expectNone(URL);
      expect(status).toBe('offline');
      expect(saved).toBeTrue();
    });

    it('GET fallita con la rete presente: ritenta da sola dopo il ritardo, una volta', async () => {
      const svc = create([{provide: EXPERIENCES_RETRY_DELAY, useValue: 20}]);
      let status: ExperiencesStatus | undefined;
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
      await clearExperiencesCache();
      expect(synchronizedExperiences.clear).not.toHaveBeenCalled();
      localStorage.setItem(EXPERIENCES_CACHE_MARKER, '1');
      await clearExperiencesCache();
      expect(synchronizedExperiences.clear).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem(EXPERIENCES_CACHE_MARKER)).toBeNull();
    });

    it('la scrittura della GET mette il marcatore', async () => {
      const svc = create();
      svc.status$().subscribe();
      httpMock.expectOne(URL).flush({data: []});
      await settle();
      expect(localStorage.getItem(EXPERIENCES_CACHE_MARKER)).toBe('1');
    });

    it('utente cambiato mentre la copia si scrive: la chiave scritta si toglie', async () => {
      let release!: () => void;
      (synchronizedExperiences.setItem as jasmine.Spy).and.callFake((async (key: string, value: unknown) => {
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
      expect(synchronizedExperiences.removeItem).toHaveBeenCalledWith('mine:1');
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
      const afterUpdate = cache.get('mine:1') as Experience[];
      expect(afterUpdate.find(e => e.id === 1)?.description).toBe('nuova');
      reload.flush({data: [{...item(1, 3, null), description: 'nuova'}, item(2, 3, null)]});
      await settle();
      svc.remove(2).subscribe();
      httpMock.expectOne({method: 'DELETE', url: `${URL}/2`}).flush(null, {status: 204, statusText: 'No Content'});
      const reload2 = httpMock.expectOne({method: 'GET', url: URL});
      await settle();
      expect((cache.get('mine:1') as Experience[]).map(e => e.id)).toEqual([1]);
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
      expect((cache.get('mine:1') as Experience[]).map(e => e.id)).toEqual([7, 1]);
      reload.flush({data: [item(7, 3, null), item(1, 3, null)]});
    });

    it('al massimo 3 tentativi automatici, con attesa che raddoppia; «Riprova» riparte da zero', async () => {
      const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      const svc = create([{provide: EXPERIENCES_RETRY_DELAY, useValue: 40}]);
      let status: ExperiencesStatus | undefined;
      svc.status$().subscribe(s => (status = s));
      const fail = () => httpMock.expectOne(URL).flush({}, {status: 500, statusText: 'Err'});
      fail();
      // tentativi dopo 40, 80 e 160 ms
      for (const delay of [40, 80, 160]) {
        await settle();
        httpMock.expectNone(URL);
        await wait(delay + 30);
        fail();
      }
      await wait(400);
      httpMock.expectNone(URL);
      expect(status).toBe('error');
      svc.refresh();
      fail();
      await wait(70);
      // contatore azzerato: il primo tentativo automatico riparte dopo 40 ms
      httpMock.expectOne(URL).flush({data: []});
      expect(status).toBe('active');
    });
  });
});
