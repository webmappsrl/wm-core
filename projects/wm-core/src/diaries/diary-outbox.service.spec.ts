import {HttpErrorResponse} from '@angular/common/http';
import {BehaviorSubject, Observable, of, throwError} from 'rxjs';
import {online} from '@wm-core/store/network/network.selector';
import {deviceDiaryOutbox} from '@wm-core/utils/localForage';
import {DiaryOutboxItem, DiaryOutboxService} from './diary-outbox.service';
import {selectDiariesSession} from './diary.service';

/** Coda di invio offline dei diari nuovi (oc:8169, ciclo 2). */
describe('DiaryOutboxService (oc:8169)', () => {
  const DAY = 24 * 60 * 60 * 1000;
  let online$: BehaviorSubject<boolean>;
  let session$: BehaviorSubject<{logged: boolean; userId: number | null}>;
  let diarySvc: {create: jasmine.Spy; refresh: jasmine.Spy};
  let drafts: {purgeOlderThan: jasmine.Spy};
  let svc: DiaryOutboxService;

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  const until = async (cond: () => boolean, maxMs = 1500) => {
    const start = Date.now();
    while (!cond() && Date.now() - start < maxMs) await wait(5);
  };
  const draft = (uuid: string) => ({uuid, layerId: 3, description: 'ciao', newPhotos: [new Blob(['a'])], publicationConsent: true, ratings: {route: 4, hospitality: null, difficulty: 1}, walkDates: {start: '2026-05-10', end: '2026-05-11'}});
  const items = async () => {
    const all: DiaryOutboxItem[] = [];
    await deviceDiaryOutbox.iterate<DiaryOutboxItem, void>(v => void all.push(v));
    return all;
  };

  function make(): DiaryOutboxService {
    const store = {select: (sel: unknown) => (sel === online ? online$ : session$)};
    return new DiaryOutboxService(store as any, diarySvc as any, drafts as any, [20, 40, 60]);
  }

  beforeEach(async () => {
    await deviceDiaryOutbox.clear();
    online$ = new BehaviorSubject<boolean>(false);
    session$ = new BehaviorSubject({logged: true, userId: 5});
    diarySvc = {create: jasmine.createSpy('create').and.returnValue(of({})), refresh: jasmine.createSpy('refresh')};
    drafts = {purgeOlderThan: jasmine.createSpy('purgeOlderThan').and.resolveTo(0)};
    svc = make();
  });

  afterEach(async () => {
    svc.ngOnDestroy();
    await deviceDiaryOutbox.clear();
  });

  it('al ritorno della rete invia il diario in coda con lo stesso uuid e lo rimuove', async () => {
    await svc.start();
    await svc.enqueue(draft('u-1'), 5);
    expect(diarySvc.create).not.toHaveBeenCalled();
    online$.next(true);
    await until(() => diarySvc.create.calls.count() === 1);
    expect(diarySvc.create.calls.argsFor(0)[0].uuid).toBe('u-1');
    expect(diarySvc.create.calls.argsFor(0)[0].publicationConsent).toBeTrue();
    expect(diarySvc.create.calls.argsFor(0)[0].ratings).toEqual({route: 4, hospitality: null, difficulty: 1});
    expect(diarySvc.create.calls.argsFor(0)[0].walkDates).toEqual({start: '2026-05-10', end: '2026-05-11'});
    await wait(30);
    expect((await items()).length).toBe(0);
  });

  it('non invia gli elementi di un altro utente', async () => {
    await svc.start();
    await svc.enqueue(draft('u-a'), 7);
    online$.next(true);
    await wait(60);
    expect(diarySvc.create).not.toHaveBeenCalled();
    expect((await items()).length).toBe(1);
  });

  it('su 422 marca failed con il messaggio e non ritenta', async () => {
    diarySvc.create.and.returnValue(throwError(() => new HttpErrorResponse({status: 422})));
    await svc.start();
    await svc.enqueue(draft('u-2'), 5);
    online$.next(true);
    await until(() => diarySvc.create.calls.count() === 1);
    await wait(150);
    expect(diarySvc.create).toHaveBeenCalledTimes(1);
    const [item] = await items();
    expect(item.status).toBe('failed');
    expect(item.errorMessage).toBeTruthy();
  });

  it('su 422 sulle foto salva il messaggio vero, non quello generico', async () => {
    diarySvc.create.and.returnValue(
      throwError(() => new HttpErrorResponse({status: 422, error: {errors: {'images.0': ['too big']}}})),
    );
    await svc.start();
    await svc.enqueue(draft('u-9'), 5);
    online$.next(true);
    await until(() => diarySvc.create.calls.count() === 1);
    await wait(30);
    expect((await items())[0].errorMessage).toBe('Una o più foto non sono valide: usa JPEG, PNG o WebP fino a 5 MB.');
  });

  it('su 429 ritenta come per un errore del server', async () => {
    diarySvc.create.and.returnValues(throwError(() => new HttpErrorResponse({status: 429})), of({}));
    await svc.start();
    await svc.enqueue(draft('u-10'), 5);
    online$.next(true);
    await until(() => diarySvc.create.calls.count() === 2, 1500);
    expect(diarySvc.create).toHaveBeenCalledTimes(2);
  });

  it('l\'avviso al logout conta solo i diari in attesa, non quelli non inviati', async () => {
    diarySvc.create.and.returnValue(throwError(() => new HttpErrorResponse({status: 422})));
    await svc.start();
    await svc.enqueue(draft('u-11'), 5);
    online$.next(true);
    await until(() => diarySvc.create.calls.count() === 1);
    await wait(30);
    online$.next(false);
    await svc.enqueue(draft('u-12'), 5);
    expect(await svc.pendingCount(5)).toBe(1);
  });

  it('su 500 ritenta con attese crescenti', async () => {
    diarySvc.create.and.returnValues(
      throwError(() => new HttpErrorResponse({status: 500})),
      throwError(() => new HttpErrorResponse({status: 500})),
      of({}),
    );
    await svc.start();
    await svc.enqueue(draft('u-3'), 5);
    online$.next(true);
    await until(() => diarySvc.create.calls.count() === 3, 2000);
    expect(diarySvc.create).toHaveBeenCalledTimes(3);
    await wait(30);
    expect((await items()).length).toBe(0);
  });

  it('su 401 resta pending e riparte dopo il login', async () => {
    diarySvc.create.and.returnValues(throwError(() => new HttpErrorResponse({status: 401})), of({}));
    await svc.start();
    await svc.enqueue(draft('u-4'), 5);
    online$.next(true);
    await until(() => diarySvc.create.calls.count() === 1);
    await wait(100);
    expect(diarySvc.create).toHaveBeenCalledTimes(1);
    expect((await items())[0].status).toBe('pending');
    session$.next({logged: false, userId: null});
    session$.next({logged: true, userId: 5});
    await until(() => diarySvc.create.calls.count() === 2);
    expect(diarySvc.create).toHaveBeenCalledTimes(2);
  });

  it('con due eventi online ravvicinati fa un solo POST', async () => {
    let release: () => void = () => {};
    diarySvc.create.and.returnValue(
      new Observable((sub: any) => {
        release = () => {
          sub.next({});
          sub.complete();
        };
      }),
    );
    await svc.start();
    await svc.enqueue(draft('u-5'), 5);
    online$.next(true);
    online$.next(false);
    online$.next(true);
    await wait(60);
    expect(diarySvc.create).toHaveBeenCalledTimes(1);
    release();
  });

  it('a coda vuota start non invia nulla', async () => {
    online$.next(true);
    await svc.start();
    await wait(50);
    expect(diarySvc.create).not.toHaveBeenCalled();
  });

  it('start cancella gli elementi più vecchi di 90 giorni e pulisce le bozze', async () => {
    const old: DiaryOutboxItem = {
      uuid: 'vecchio', userId: 5, layerId: 3, description: 'x', photos: [], publicationConsent: false,
      status: 'pending', attempts: 0, nextAttemptAt: 0, updatedAt: Date.now() - 91 * DAY,
    };
    await deviceDiaryOutbox.setItem(old.uuid, old);
    await svc.start();
    expect((await items()).length).toBe(0);
    expect(drafts.purgeOlderThan).toHaveBeenCalledWith(90);
  });

  it('items$ mostra solo gli elementi dell utente corrente nel contesto', async () => {
    await svc.start();
    await svc.enqueue(draft('u-6'), 5);
    await svc.enqueue({...draft('u-7'), layerId: 4}, 5);
    await svc.enqueue(draft('u-8'), 7);
    let seen: DiaryOutboxItem[] = [];
    const sub = svc.items$({layerId: 3}).subscribe(list => (seen = list));
    await until(() => seen.length > 0);
    expect(seen.map(i => i.uuid)).toEqual(['u-6']);
    expect(await svc.pendingCount(5)).toBe(2);
    sub.unsubscribe();
  });
});
