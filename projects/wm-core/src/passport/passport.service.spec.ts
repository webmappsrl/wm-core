import {HttpErrorResponse} from '@angular/common/http';
import {BehaviorSubject, firstValueFrom, of, throwError} from 'rxjs';
import {isLogged} from '@wm-core/store/auth/auth.selectors';
import {PassportService} from './passport.service';
import {passportRingDegrees, toLayerId} from './passport.utils';
import {
  LAYER_30_PROGRESS,
  LAYER_40_GPS_PARTIAL,
  LAYER_40_PROGRESS,
  LAYER_63_PROGRESS,
} from './passport-progress.fixtures';

describe('PassportService (oc:8166, oc:8676)', () => {
  const ORIGIN = 'http://127.0.0.1:8000';
  let http: {get: jasmine.Spy; post: jasmine.Spy};

  function create(logged = true, currentLang: string | undefined = 'it'): PassportService {
    const store = {select: (sel: unknown) => (sel === isLogged ? of(logged) : of(null))} as any;
    return new PassportService(store, http as any, {origin: ORIGIN} as any, {currentLang} as any);
  }

  const request = (serialNumber?: string) => ({
    layerId: 3,
    photos: [new Blob(['a'], {type: 'image/jpeg'}), new Blob(['b'], {type: 'image/png'})],
    ...(serialNumber ? {serialNumber} : {}),
    disclaimerAccepted: true as const,
  });

  beforeEach(() => {
    http = {get: jasmine.createSpy('get'), post: jasmine.createSpy('post')};
  });

  describe('progresso: GET /api/layer/{id}/progress (oc:8676)', () => {
    const answer = (byLayer: Record<number, unknown>) =>
      http.get.and.callFake((url: string) => {
        const id = Number(url.match(/layer\/(\d+)\/progress/)?.[1]);
        return byLayer[id] instanceof Error ? throwError(() => byLayer[id]) : of(byLayer[id]);
      });

    /** Service senza listener `resume` vero: `App` è un Proxy di Capacitor, non si lascia spiare. */
    function createQuiet(logged = true): PassportService {
      const svc = create(logged);
      spyOn<any>(svc, '_addResumeListener').and.returnValue(new Promise(() => {}));
      return svc;
    }

    it('chiama la rotta del layer e converte cammino e tappe', async () => {
      answer({40: LAYER_40_PROGRESS});
      const p = await firstValueFrom(createQuiet().getProgress(40));

      expect(http.get).toHaveBeenCalledWith(`${ORIGIN}/api/layer/40/progress`);
      expect(p.layerId).toBe(40);
      expect(p.totalStages).toBe(13);
      expect(p.completedStages).toBe(6);
      expect(p.percent).toBe(46);
      expect(p.completed).toBeFalse();
      expect(p.stages.length).toBe(13);
      const s203 = p.stages.find(s => s.trackId === 203);
      expect(s203.status).toBe('completed');
      expect(s203.completedAt).toBe('2026-09-30T14:45:55+00:00');
      expect(s203.distance).toBe(19.5);
      expect(s203.source).toBe('manual');
      expect(s203.name.it.startsWith('Cammino Grande di Celestino - Tappa 06')).toBeTrue();
    });

    it('le tappe non validate con progress 0 sono not_started, senza data né origine', async () => {
      answer({40: LAYER_40_PROGRESS});
      const s215 = (await firstValueFrom(createQuiet().getProgress(40))).stages.find(s => s.trackId === 215);

      expect(s215.status).toBe('not_started');
      expect(s215.completedAt).toBeUndefined();
      expect(s215.source).toBeUndefined();
      expect(s215.percent).toBeUndefined();
    });

    it('una tappa non validata con progress parziale è in_progress, e non cambia i conteggi', async () => {
      answer({40: LAYER_40_GPS_PARTIAL});
      const p = await firstValueFrom(createQuiet().getProgress(40));
      const s216 = p.stages.find(s => s.trackId === 216);

      expect(s216.status).toBe('in_progress');
      expect(s216.percent).toBe(62);
      expect(p.completedStages).toBe(6);
    });

    it('uno stato sconosciuto diventa not_started; name e distance assenti hanno un default', async () => {
      answer({7: {...LAYER_30_PROGRESS, layer_id: 7, total: 1, tracks: [{id: 1, status: 'boh'}]}});
      const [stage] = (await firstValueFrom(createQuiet().getProgress(7))).stages;

      expect(stage.status).toBe('not_started');
      expect(stage.name).toEqual({});
      expect(stage.distance).toBe(0);
    });

    it('visibleProgress: null senza tappe, senza login o senza id', async () => {
      answer({30: LAYER_30_PROGRESS, 63: LAYER_63_PROGRESS});

      expect(await firstValueFrom(createQuiet().visibleProgress(30))).toBeNull();
      expect(await firstValueFrom(createQuiet(false).visibleProgress(63))).toBeNull();
      expect(await firstValueFrom(createQuiet().visibleProgress(null))).toBeNull();
      expect((await firstValueFrom(createQuiet().visibleProgress(63)))?.totalStages).toBe(3);
    });

    it('due consumatori dello stesso layer fanno una sola richiesta', () => {
      answer({40: LAYER_40_PROGRESS});
      const svc = createQuiet();
      const a = svc.progress$(40).subscribe();
      const b = svc.visibleProgress(40).subscribe();

      expect(http.get).toHaveBeenCalledTimes(1);
      a.unsubscribe();
      b.unsubscribe();
    });

    it("se una rilettura fallisce riemette l'ultimo valore letto", () => {
      answer({40: LAYER_40_PROGRESS});
      const svc = createQuiet();
      const seen: Array<number | null> = [];
      const sub = svc.progress$(40).subscribe(p => seen.push(p ? p.completedStages : null));
      answer({40: new Error('offline')});
      svc.refreshProgress(40);

      expect(seen).toEqual([6, 6]);
      sub.unsubscribe();
    });

    it("l'ultimo valore resta per la sessione anche dopo che nessuno guarda più il layer", () => {
      answer({40: LAYER_40_PROGRESS});
      const svc = createQuiet();
      svc.progress$(40).subscribe().unsubscribe();
      answer({40: new Error('offline')});
      const seen: Array<number | null> = [];
      svc.progress$(40).subscribe(p => seen.push(p ? p.completedStages : null)).unsubscribe();

      expect(seen).toEqual([6]);
    });

    it("al logout dimentica l'ultimo valore: un altro utente non vede le tappe del precedente", () => {
      const logged$ = new BehaviorSubject(true);
      const store = {select: () => logged$} as any;
      const svc = new PassportService(store, http as any, {origin: ORIGIN} as any, {currentLang: 'it'} as any);
      spyOn<any>(svc, '_addResumeListener').and.returnValue(new Promise(() => {}));
      answer({40: LAYER_40_PROGRESS});
      svc.progress$(40).subscribe().unsubscribe();
      logged$.next(false);
      logged$.next(true);
      answer({40: new Error('offline')});
      const seen: unknown[] = [];
      svc.progress$(40).subscribe(p => seen.push(p)).unsubscribe();

      expect(seen).toEqual([null]);
    });

    it('senza nessuna lettura riuscita emette null', () => {
      answer({40: new Error('offline')});
      const seen: unknown[] = [];
      createQuiet().progress$(40).subscribe(p => seen.push(p)).unsubscribe();

      expect(seen).toEqual([null]);
    });

    it('refreshProgress rilegge solo il layer indicato', () => {
      answer({40: LAYER_40_PROGRESS, 63: LAYER_63_PROGRESS});
      const svc = createQuiet();
      const a = svc.progress$(40).subscribe();
      const b = svc.progress$(63).subscribe();
      http.get.calls.reset();
      svc.refreshProgress(40);

      expect(http.get).toHaveBeenCalledTimes(1);
      expect(http.get).toHaveBeenCalledWith(`${ORIGIN}/api/layer/40/progress`);
      a.unsubscribe();
      b.unsubscribe();
    });

    it('il ritorno in primo piano rilegge il progresso', () => {
      answer({40: LAYER_40_PROGRESS});
      const svc = create();
      let resumeCb: () => void;
      spyOn<any>(svc, '_addResumeListener').and.callFake((cb: () => void) => {
        resumeCb = cb;
        return new Promise(() => {});
      });
      const sub = svc.progress$(40).subscribe();
      resumeCb();

      expect(http.get).toHaveBeenCalledTimes(2);
      sub.unsubscribe();
    });
  });

  describe('dati tecnici della tappa e immagine di condivisione (oc:8702)', () => {
    const progressOf = (tracks: unknown[]) => ({
      layer_id: 3,
      validated: 1,
      total: tracks.length,
      percentage: 50,
      completed: false,
      tracks,
    });

    function createQuiet(): PassportService {
      const svc = create();
      spyOn<any>(svc, '_addResumeListener').and.returnValue(new Promise(() => {}));
      return svc;
    }

    it('copia ref, from, to, ascent, descent, image e shareable quando presenti', async () => {
      http.get.and.returnValue(
        of(
          progressOf([
            {
              id: 1,
              status: 'validated',
              ref: '01',
              from: 'A',
              to: 'B',
              ascent: 358,
              descent: 120,
              image: 'http://x/i.jpg',
              shareable: true,
            },
          ]),
        ),
      );
      const [stage] = (await firstValueFrom(createQuiet().getProgress(3))).stages;
      expect(stage.ref).toBe('01');
      expect(stage.from).toBe('A');
      expect(stage.to).toBe('B');
      expect(stage.ascent).toBe(358);
      expect(stage.descent).toBe(120);
      expect(stage.image).toBe('http://x/i.jpg');
      expect(stage.shareable).toBeTrue();
    });

    it('valori null o vuoti non producono le chiavi', async () => {
      http.get.and.returnValue(
        of(progressOf([{id: 1, status: 'validated', ref: null, from: '', to: null, shareable: false}])),
      );
      const [stage] = (await firstValueFrom(createQuiet().getProgress(3))).stages;
      expect('ref' in stage).toBeFalse();
      expect('from' in stage).toBeFalse();
      expect('to' in stage).toBeFalse();
      expect('shareable' in stage).toBeFalse();
    });

    it('un backend vecchio senza i campi nuovi lascia shareable assente', async () => {
      http.get.and.returnValue(of(progressOf([{id: 1, status: 'validated'}])));
      const [stage] = (await firstValueFrom(createQuiet().getProgress(3))).stages;
      expect('shareable' in stage).toBeFalse();
      expect('image' in stage).toBeFalse();
    });

    it('requestStageShareImage fa la POST con Accept-Language', async () => {
      const res = {image_url: 'http://x/i.png', share_url: 'http://x/s'};
      http.post.and.returnValue(of(res));
      const out = await firstValueFrom(create(true, 'en').requestStageShareImage(3, 42));
      const [url, , options] = http.post.calls.mostRecent().args;
      expect(url).toBe(`${ORIGIN}/api/layer/3/stage/42/share-image`);
      expect(options.headers.get('Accept-Language')).toBe('en');
      expect(out).toEqual(res);
    });

    it('requestStageShareImage senza lingua non manda Accept-Language', async () => {
      http.post.and.returnValue(of({image_url: 'a', share_url: 'b'}));
      await firstValueFrom(create(true, '').requestStageShareImage(3, 42));
      const options = http.post.calls.mostRecent().args[2];
      expect(options?.headers?.has('Accept-Language') ?? false).toBeFalse();
    });
  });

  describe('stato della richiesta: GET /api/layer/{id}/certification', () => {
    it('chiama la rotta del layer e mappa none', async () => {
      http.get.and.returnValue(of({status: 'none'}));

      const c = await firstValueFrom(create().getCertification(3));

      expect(http.get).toHaveBeenCalledWith(`${ORIGIN}/api/layer/3/certification`);
      expect(c).toEqual({layerId: 3, status: 'none'});
    });

    it('mappa pending con submitted_at in submittedAt', async () => {
      http.get.and.returnValue(of({status: 'pending', submitted_at: '2026-09-29T10:00:00+02:00'}));

      const c = await firstValueFrom(create().getCertification(3));

      expect(c).toEqual({layerId: 3, status: 'pending', submittedAt: '2026-09-29T10:00:00+02:00'});
    });

    it('approvata con nota: stato, date e nota (oc:8671)', async () => {
      http.get.and.returnValue(
        of({
          status: 'approved',
          submitted_at: '2026-09-30T11:14:00+00:00',
          decided_at: '2026-09-30T11:29:00+00:00',
          decision_note: 'Timbri 2 e 5 leggibili',
        }),
      );

      const c = await firstValueFrom(create().getCertification(3));

      expect(c).toEqual({
        layerId: 3,
        status: 'approved',
        submittedAt: '2026-09-30T11:14:00+00:00',
        decidedAt: '2026-09-30T11:29:00+00:00',
        decisionNote: 'Timbri 2 e 5 leggibili',
      });
    });

    it('rifiutata senza nota: decisionNote assente (oc:8671)', async () => {
      http.get.and.returnValue(
        of({
          status: 'rejected',
          submitted_at: '2026-09-30T11:14:00+00:00',
          decided_at: '2026-09-30T11:29:00+00:00',
          decision_note: null,
        }),
      );

      const c = await firstValueFrom(create().getCertification(3));

      expect(c.status).toBe('rejected');
      expect(c.decidedAt).toBe('2026-09-30T11:29:00+00:00');
      expect(c.decisionNote).toBeUndefined();
    });

    it('nota vuota o di soli spazi vale come assente (oc:8671)', async () => {
      http.get.and.returnValue(of({status: 'rejected', decided_at: '2026-09-30T11:29:00+00:00', decision_note: '   '}));

      expect((await firstValueFrom(create().getCertification(3))).decisionNote).toBeUndefined();
    });

    it('uno stato sconosciuto diventa none', async () => {
      http.get.and.returnValue(of({status: 'cancelled', submitted_at: '2026-09-29T10:00:00+02:00'}));

      expect(await firstValueFrom(create().getCertification(3))).toEqual({layerId: 3, status: 'none'});
    });
  });

  describe('invio: POST /api/layer/{id}/certification', () => {
    it('manda il multipart con images[], serial_number e disclaimer_accepted', async () => {
      http.post.and.returnValue(of({status: 'pending', submitted_at: '2026-09-29T10:00:00+02:00'}));

      const c = await firstValueFrom(create().submitCertification(request('CG-2026-00341')));

      const [url, body] = http.post.calls.mostRecent().args;
      const form = body as FormData;
      expect(url).toBe(`${ORIGIN}/api/layer/3/certification`);
      const images = form.getAll('images[]') as File[];
      expect(images.length).toBe(2);
      expect(images[0].name).toBe('credenziale_1.jpg');
      expect(images[1].name).toBe('credenziale_2.png');
      expect(form.get('serial_number')).toBe('CG-2026-00341');
      expect(form.get('disclaimer_accepted')).toBe('1');
      expect(c).toEqual({layerId: 3, status: 'pending', submittedAt: '2026-09-29T10:00:00+02:00'});
    });

    it('senza numero seriale non manda serial_number', async () => {
      http.post.and.returnValue(of({status: 'pending', submitted_at: '2026-09-29T10:00:00+02:00'}));

      await firstValueFrom(create().submitCertification(request()));

      expect((http.post.calls.mostRecent().args[1] as FormData).has('serial_number')).toBeFalse();
    });

    it('409 (richiesta già in attesa) rilegge lo stato e lo restituisce, senza errore', async () => {
      http.post.and.returnValue(throwError(() => new HttpErrorResponse({status: 409})));
      http.get.and.returnValue(of({status: 'pending', submitted_at: '2026-09-28T09:00:00+02:00'}));

      const c = await firstValueFrom(create().submitCertification(request()));

      expect(c).toEqual({layerId: 3, status: 'pending', submittedAt: '2026-09-28T09:00:00+02:00'});
    });

    it('gli altri errori (422, 413, rete) arrivano al form', async () => {
      http.post.and.returnValue(throwError(() => new HttpErrorResponse({status: 422})));

      await expectAsync(firstValueFrom(create().submitCertification(request()))).toBeRejected();
    });

    it("il POST manda Accept-Language con la lingua scelta nell'app (oc:8671)", async () => {
      http.post.and.returnValue(of({status: 'pending', submitted_at: '2026-09-30T11:14:00+00:00'}));

      await firstValueFrom(create(true, 'en').submitCertification(request()));

      const options = http.post.calls.mostRecent().args[2];
      expect(options.headers.get('Accept-Language')).toBe('en');
    });

    it('senza lingua impostata il POST non manda Accept-Language (oc:8671)', async () => {
      http.post.and.returnValue(of({status: 'pending', submitted_at: '2026-09-30T11:14:00+00:00'}));

      await firstValueFrom(create(true, '').submitCertification(request()));

      const options = http.post.calls.mostRecent().args[2];
      expect(options?.headers?.has('Accept-Language') ?? false).toBeFalse();
    });

    it('il GET non manda Accept-Language (oc:8671)', async () => {
      http.get.and.returnValue(of({status: 'none'}));

      await firstValueFrom(create(true, 'en').getCertification(3));

      expect(http.get.calls.mostRecent().args.length).toBe(1);
    });
  });

  describe('ritorno in primo piano: appResume$ (oc:8671)', () => {
    let resumeCb: () => void;
    let remove: jasmine.Spy;
    let register: (value: {remove: () => Promise<void>}) => void;

    let addListener: jasmine.Spy;

    // `App` di Capacitor è un Proxy e non si lascia spiare: lo spy va sul metodo che lo avvolge
    function createWithListener(): PassportService {
      const svc = create();
      addListener = spyOn<any>(svc, '_addResumeListener').and.callFake((cb: () => void) => {
        resumeCb = cb;
        return new Promise(resolve => (register = resolve));
      });
      return svc;
    }

    beforeEach(() => {
      remove = jasmine.createSpy('remove').and.resolveTo();
    });

    it('emette a ogni resume e rimuove il listener alla disiscrizione', async () => {
      const emitted: void[] = [];
      const sub = createWithListener().appResume$().subscribe(v => emitted.push(v));
      register({remove});
      await Promise.resolve();

      resumeCb();
      resumeCb();
      sub.unsubscribe();
      await Promise.resolve();

      expect(addListener).toHaveBeenCalledTimes(1);
      expect(emitted.length).toBe(2);
      expect(remove).toHaveBeenCalledTimes(1);
    });

    it('rimuove il listener anche se la disiscrizione arriva prima della registrazione', async () => {
      const sub = createWithListener().appResume$().subscribe();
      sub.unsubscribe();

      register({remove});
      await Promise.resolve();
      await Promise.resolve();

      expect(remove).toHaveBeenCalledTimes(1);
    });
  });

  describe('passaporto: GET /api/passport (oc:8701)', () => {
    const ROUTES = {
      routes: [
        {layer_id: 40, validated: 6, total: 13, percentage: 46, completed: false},
        {layer_id: 63, validated: 6, total: 6, percentage: 100, completed: true},
      ],
    };

    /** Service con `isLogged` pilotabile e senza listener `resume` vero. */
    function createLogged(logged$: BehaviorSubject<boolean>): PassportService {
      const store = {select: (sel: unknown) => (sel === isLogged ? logged$ : of(null))} as any;
      const svc = new PassportService(store, http as any, {origin: ORIGIN} as any, {
        currentLang: 'it',
      } as any);
      spyOn<any>(svc, '_addResumeListener').and.returnValue(new Promise(() => {}));
      return svc;
    }

    const passportCalls = () =>
      http.get.calls.allArgs().filter(([url]) => url === `${ORIGIN}/api/passport`).length;

    it('chiama /api/passport e indicizza i cammini per layer_id', async () => {
      http.get.and.returnValue(of(ROUTES));
      const routes = await firstValueFrom(createLogged(new BehaviorSubject(true)).passportRoutes$());

      expect(http.get).toHaveBeenCalledWith(`${ORIGIN}/api/passport`);
      expect([...routes.keys()]).toEqual([40, 63]);
      expect(routes.get(40)).toEqual({
        layerId: 40,
        validated: 6,
        total: 13,
        percent: 46,
        completed: false,
      });
      expect(routes.get(63).completed).toBeTrue();
    });

    it('utente non loggato: null senza chiamare l\'API', async () => {
      const routes = await firstValueFrom(createLogged(new BehaviorSubject(false)).passportRoutes$());

      expect(routes).toBeNull();
      expect(http.get).not.toHaveBeenCalled();
    });

    it('errore alla prima lettura: null', async () => {
      http.get.and.returnValue(throwError(() => new Error('rete')));
      const routes = await firstValueFrom(createLogged(new BehaviorSubject(true)).passportRoutes$());

      expect(routes).toBeNull();
    });

    it('errore dopo una lettura riuscita: ultimo valore', () => {
      const svc = createLogged(new BehaviorSubject(true));
      const seen: Array<Map<number, unknown> | null> = [];
      http.get.and.returnValue(of(ROUTES));
      const sub = svc.passportRoutes$().subscribe(r => seen.push(r));
      http.get.and.returnValue(throwError(() => new Error('rete')));
      svc.refreshProgress(40);
      sub.unsubscribe();

      expect(seen.length).toBe(2);
      expect([...seen[1].keys()]).toEqual([40, 63]);
    });

    it('due iscritti, una sola richiesta', () => {
      http.get.and.returnValue(of(ROUTES));
      const svc = createLogged(new BehaviorSubject(true));
      const a = svc.passportRoutes$().subscribe();
      const b = svc.passportRoutes$().subscribe();

      expect(passportCalls()).toBe(1);
      a.unsubscribe();
      b.unsubscribe();
    });

    it('refreshProgress rilegge anche /api/passport', () => {
      http.get.and.returnValue(of(ROUTES));
      const svc = createLogged(new BehaviorSubject(true));
      const sub = svc.passportRoutes$().subscribe();
      svc.refreshProgress(40);

      expect(passportCalls()).toBe(2);
      sub.unsubscribe();
    });

    it('al logout l\'ultimo valore si dimentica', () => {
      const logged$ = new BehaviorSubject(true);
      const svc = createLogged(logged$);
      const seen: Array<Map<number, unknown> | null> = [];
      http.get.and.returnValue(of(ROUTES));
      const sub = svc.passportRoutes$().subscribe(r => seen.push(r));
      logged$.next(false);
      http.get.and.returnValue(throwError(() => new Error('rete')));
      logged$.next(true);
      sub.unsubscribe();

      expect(seen.map(r => (r ? [...r.keys()] : null))).toEqual([[40, 63], null, null]);
    });
  });

  describe('indice delle tappe validate (oc:8701)', () => {
    /** Service con risposte per URL e senza listener `resume` vero. */
    function createIndexed(byUrl: Record<string, unknown>, logged = true): PassportService {
      http.get.and.callFake((url: string) => {
        const key = url.replace(ORIGIN, '');
        return byUrl[key] instanceof Error ? throwError(() => byUrl[key]) : of(byUrl[key]);
      });
      const svc = create(logged);
      spyOn<any>(svc, '_addResumeListener').and.returnValue(new Promise(() => {}));
      return svc;
    }

    const routes = (...ids: number[]) => ({
      routes: ids.map(id => ({layer_id: id, validated: 1, total: 3, percentage: 33, completed: false})),
    });

    it('chiede /progress solo dei cammini iniziati e indicizza le tappe validate', async () => {
      const svc = createIndexed({
        '/api/passport': routes(40, 63),
        '/api/layer/40/progress': LAYER_40_PROGRESS,
        '/api/layer/63/progress': LAYER_63_PROGRESS,
      });
      const index = await firstValueFrom(svc.stageIndex$());
      const urls = http.get.calls.allArgs().map(([url]) => url.replace(ORIGIN, ''));

      expect(urls.sort()).toEqual(['/api/layer/40/progress', '/api/layer/63/progress', '/api/passport']);
      expect([...index.completedAt.keys()].sort((a, b) => a - b)).toEqual([203, 218, 309, 369, 704, 710]);
      expect(index.completedAt.get(203)).toBe('2026-09-30T14:45:55+00:00');
      expect(index.pendingLayers.size).toBe(0);
    });

    it('nessun cammino iniziato → indice vuoto, nessuna /progress', async () => {
      const svc = createIndexed({'/api/passport': {routes: []}});
      const index = await firstValueFrom(svc.stageIndex$());

      expect(index.completedAt.size).toBe(0);
      expect(index.pendingLayers.size).toBe(0);
      expect(http.get).toHaveBeenCalledTimes(1);
    });

    it('/progress di un cammino fallisce alla prima lettura → cammino pendente, gli altri restano', async () => {
      const svc = createIndexed({
        '/api/passport': routes(40, 63),
        '/api/layer/40/progress': LAYER_40_PROGRESS,
        '/api/layer/63/progress': new Error('timeout'),
      });
      const index = await firstValueFrom(svc.stageIndex$());

      expect([...index.pendingLayers]).toEqual([63]);
      expect(index.completedAt.has(203)).toBeTrue();
    });

    it('una rilettura di /api/passport con gli stessi cammini non rilegge le /progress', () => {
      const svc = createIndexed({
        '/api/passport': routes(40, 63),
        '/api/layer/40/progress': LAYER_40_PROGRESS,
        '/api/layer/63/progress': LAYER_63_PROGRESS,
      });
      const progressCalls = (id: number) =>
        http.get.calls.allArgs().filter(([url]) => url === `${ORIGIN}/api/layer/${id}/progress`).length;
      const sub = svc.stageIndex$().subscribe();
      svc.refreshProgress(40);

      expect(progressCalls(40)).toBe(2);
      expect(progressCalls(63)).toBe(1);
      sub.unsubscribe();
    });

    it('utente non loggato → null', async () => {
      const svc = createIndexed({}, false);

      expect(await firstValueFrom(svc.stageIndex$())).toBeNull();
      expect(http.get).not.toHaveBeenCalled();
    });
  });

  it('passportRingDegrees e toLayerId: unica regola per anello, badge e dettaglio', () => {
    expect(passportRingDegrees(62)).toBeCloseTo(223.2);
    expect(passportRingDegrees(150)).toBe(360);
    expect(passportRingDegrees(undefined)).toBe(0);
    expect(toLayerId('55')).toBe(55);
    expect(toLayerId('')).toBeNull();
    expect(toLayerId(null)).toBeNull();
  });
});
