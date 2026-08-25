> Ticket: oc:8374

# Fix cache config non ricaricata correttamente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Far sì che il client non dichiari mai al server (header `If-Modified-Since`) di avere già una cache valida quando in realtà non ce l'ha, così che config/icone tornino sempre a scaricarsi correttamente invece di restare bloccate su una risposta 304 senza dati utilizzabili.

**Architecture:** Il fix vive interamente nella utility condivisa `handleApiCache` (`utils/api-cache-handler.ts`), che decide se inviare l'header condizionale basandosi sul dato di cache **effettivamente parsato con successo** (`parsedData`), non sulla sua presenza grezza, e attende (`await`) la scrittura della cache in IndexedDB prima di aggiornare il timestamp in `localStorage`. `ConfService.getConf()` smette di costruire autonomamente lo stesso header (che oggi bypassa la logica interna della utility), delegando interamente la decisione a `handleApiCache` tramite un nuovo parametro esplicito `forceFreshRequest` — usato per preservare, senza modificarne il comportamento, il caso speciale dello shard `carg` (che deve sempre ricevere dati freschi, mai una risposta condizionale).

**Tech Stack:** Angular 20, RxJS, `localforage` (istanza `synchronizedApi`), Jasmine + Karma (submodule wm-core).

**Spec:** `core/src/app/shared/wm-core/docs/features/8374-bug-config-non-ricaricata-correttamente/overview.md`

## Global Constraints

- Repo: submodule `wm-core` (`@wm-core/*`). Nessun file del repo principale `webmapp-app`.
- NON toccare `ec.service.ts` (`getPois()`, `getEcTrack()`) — reimplementazioni indipendenti dello stesso pattern, esplicitamente out of scope (ticket separato).
- NON toccare `icons.effects.ts`, `settings.component.ts`, `conf.reducer.ts` (nessun handler `loadConfFail`), nessun lock/mutex, nessuna telemetria, nessuna UI di errore dedicata — tutti esplicitamente out of scope in `overview.md`.
- NON aggiungere timeout/retry generale su `loadConf$` (`conf.effects.ts`).
- La firma di `handleApiCache` deve restare compatibile con la chiamata esistente in `icons.service.ts` (`handleApiCache<ICONS>(this._http, url)`, 2 soli argomenti) — qualsiasi nuovo parametro deve avere un default.
- Il branch `shardName === 'carg'` in `conf.service.ts` è un comportamento intenzionale preesistente (commit `d565438b`, "fix(conf): ignore cache on carg shard for HTTP request... ensure fresh data retrieval on the carg shard") — va preservato esattamente (mai header condizionale per `carg`, indipendentemente dallo stato della cache), non rimosso.
- Nessun testo utente introdotto — nessun requisito i18n.
- Commit convention: `fix(oc:8374): ...`.

---

### Task 1: Fix `handleApiCache` — header condizionale basato su cache valida, scrittura cache coordinata

**Files:**
- Modify: `core/src/app/shared/wm-core/projects/wm-core/src/utils/api-cache-handler.ts`
- Test: `core/src/app/shared/wm-core/projects/wm-core/src/utils/api-cache-handler.spec.ts` (nuovo)

**Interfaces:**
- Consumes: nessuna dipendenza da altri task.
- Produce: `handleApiCache<T>(http: HttpClient, url: string, updateData?: (data: T) => void, headers?: Record<string, string>, forceFreshRequest?: boolean): Observable<T>` — il nuovo 5° parametro `forceFreshRequest` (default `false`) è consumato dal Task 2 per riprodurre il comportamento speciale dello shard `carg` in `ConfService.getConf()`.

Contenuto attuale del file (per riferimento, righe 1-68):

```ts
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {synchronizedApi} from '@wm-core/utils/localForage';
import {distinctUntilChanged, shareReplay, take} from 'rxjs/operators';

export function handleApiCache<T>(
  http: HttpClient,
  url: string,
  updateData: (data: T) => void = (data: T) => {},
  headers: any = {},
): Observable<T> {
  return new Observable<T>(observer => {
    synchronizedApi.getItem(`${url}`).then((cachedData: string | null) => {
      let parsedData: T | null = null;
      const cachedLastModified = localStorage.getItem(`${url}-last-modified`);

      if (cachedData) {
        try {
          parsedData = JSON.parse(cachedData) as T;
          observer.next(parsedData);
        } catch (e) {
          console.warn('Error parsing cached data. Ignoring cache.', e);
        }
      }

      const requestHeaders = cachedLastModified
        ? {'If-Modified-Since': cachedLastModified, ...headers}
        : headers;

      http
        .get<T>(url, {
          observe: 'response',
          headers: requestHeaders,
        })
        .pipe(take(1))
        .subscribe(
          response => {
            const lastModified = response.headers.get('last-modified');

            if (response.status === 200) {
              const data = {...response.body};
              if (data) {
                updateData(data);
                synchronizedApi.setItem(`${url}`, JSON.stringify(data));
                if (lastModified) {
                  localStorage.setItem(`${url}-last-modified`, lastModified);
                }
                observer.next(data);
              }
            } else if (response.status === 304) {
              console.log('No changes detected, using cached data.');
            }
            observer.complete();
          },
          error => {
            if (!parsedData) {
              observer.error(error);
            } else {
              observer.complete();
            }
          },
        );
    });
  }).pipe(
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    shareReplay(1),
  );
}
```

- [ ] **Step 1: Scrivi i test (falliranno finché il file non viene modificato)**

Crea `core/src/app/shared/wm-core/projects/wm-core/src/utils/api-cache-handler.spec.ts`:

```ts
import {HttpClient, HttpHeaders, HttpResponse} from '@angular/common/http';
import {of} from 'rxjs';
import {handleApiCache} from './api-cache-handler';
import {synchronizedApi} from './localForage';

describe('handleApiCache', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('does not send If-Modified-Since header when cache is empty (cache miss)', done => {
    spyOn(synchronizedApi, 'getItem').and.returnValue(Promise.resolve(null));
    spyOn(synchronizedApi, 'setItem').and.returnValue(Promise.resolve());
    const url = 'http://x/conf-cache-miss.json';
    localStorage.setItem(`${url}-last-modified`, 'Wed, 01 Jan 2025 00:00:00 GMT');

    const httpGetSpy = jasmine
      .createSpy('get')
      .and.returnValue(
        of(new HttpResponse({status: 200, body: {foo: 'bar'}, headers: new HttpHeaders()})),
      );
    const httpMock = {get: httpGetSpy} as unknown as HttpClient;

    handleApiCache(httpMock, url).subscribe({
      complete: () => {
        const callArgs = httpGetSpy.calls.mostRecent().args[1];
        expect(callArgs.headers['If-Modified-Since']).toBeUndefined();
        done();
      },
    });
  });

  it('does not send If-Modified-Since header when cached data is corrupted (JSON.parse fails)', done => {
    spyOn(synchronizedApi, 'getItem').and.returnValue(Promise.resolve('not-valid-json{'));
    spyOn(synchronizedApi, 'setItem').and.returnValue(Promise.resolve());
    const url = 'http://x/conf-corrupted-cache.json';
    localStorage.setItem(`${url}-last-modified`, 'Wed, 01 Jan 2025 00:00:00 GMT');

    const httpGetSpy = jasmine
      .createSpy('get')
      .and.returnValue(
        of(new HttpResponse({status: 200, body: {foo: 'bar'}, headers: new HttpHeaders()})),
      );
    const httpMock = {get: httpGetSpy} as unknown as HttpClient;

    handleApiCache(httpMock, url).subscribe({
      complete: () => {
        const callArgs = httpGetSpy.calls.mostRecent().args[1];
        expect(callArgs.headers['If-Modified-Since']).toBeUndefined();
        done();
      },
    });
  });

  it('still sends If-Modified-Since header when a valid cache entry exists', done => {
    spyOn(synchronizedApi, 'getItem').and.returnValue(
      Promise.resolve(JSON.stringify({foo: 'cached'})),
    );
    spyOn(synchronizedApi, 'setItem').and.returnValue(Promise.resolve());
    const url = 'http://x/conf-valid-cache.json';
    localStorage.setItem(`${url}-last-modified`, 'Wed, 01 Jan 2025 00:00:00 GMT');

    const httpGetSpy = jasmine
      .createSpy('get')
      .and.returnValue(of(new HttpResponse({status: 304, headers: new HttpHeaders()})));
    const httpMock = {get: httpGetSpy} as unknown as HttpClient;

    handleApiCache(httpMock, url).subscribe({
      complete: () => {
        const callArgs = httpGetSpy.calls.mostRecent().args[1];
        expect(callArgs.headers['If-Modified-Since']).toBe('Wed, 01 Jan 2025 00:00:00 GMT');
        done();
      },
    });
  });

  it('ignores a valid cache entry and does not send If-Modified-Since when forceFreshRequest is true', done => {
    spyOn(synchronizedApi, 'getItem').and.returnValue(
      Promise.resolve(JSON.stringify({foo: 'cached'})),
    );
    spyOn(synchronizedApi, 'setItem').and.returnValue(Promise.resolve());
    const url = 'http://x/conf-force-fresh.json';
    localStorage.setItem(`${url}-last-modified`, 'Wed, 01 Jan 2025 00:00:00 GMT');

    const httpGetSpy = jasmine
      .createSpy('get')
      .and.returnValue(
        of(new HttpResponse({status: 200, body: {foo: 'fresh'}, headers: new HttpHeaders()})),
      );
    const httpMock = {get: httpGetSpy} as unknown as HttpClient;

    handleApiCache(httpMock, url, undefined, {}, true).subscribe({
      complete: () => {
        const callArgs = httpGetSpy.calls.mostRecent().args[1];
        expect(callArgs.headers['If-Modified-Since']).toBeUndefined();
        done();
      },
    });
  });

  it('does not write last-modified to localStorage when synchronizedApi.setItem rejects', done => {
    spyOn(synchronizedApi, 'getItem').and.returnValue(Promise.resolve(null));
    spyOn(synchronizedApi, 'setItem').and.returnValue(Promise.reject(new Error('quota exceeded')));
    const url = 'http://x/conf-setitem-fail.json';

    const httpGetSpy = jasmine.createSpy('get').and.returnValue(
      of(
        new HttpResponse({
          status: 200,
          body: {foo: 'bar'},
          headers: new HttpHeaders({'last-modified': 'Thu, 02 Jan 2025 00:00:00 GMT'}),
        }),
      ),
    );
    const httpMock = {get: httpGetSpy} as unknown as HttpClient;

    handleApiCache(httpMock, url).subscribe({
      complete: () => {
        expect(localStorage.getItem(`${url}-last-modified`)).toBeNull();
        done();
      },
    });
  });

  it('writes last-modified to localStorage when synchronizedApi.setItem succeeds', done => {
    spyOn(synchronizedApi, 'getItem').and.returnValue(Promise.resolve(null));
    spyOn(synchronizedApi, 'setItem').and.returnValue(Promise.resolve());
    const url = 'http://x/conf-setitem-success.json';

    const httpGetSpy = jasmine.createSpy('get').and.returnValue(
      of(
        new HttpResponse({
          status: 200,
          body: {foo: 'bar'},
          headers: new HttpHeaders({'last-modified': 'Thu, 02 Jan 2025 00:00:00 GMT'}),
        }),
      ),
    );
    const httpMock = {get: httpGetSpy} as unknown as HttpClient;

    handleApiCache(httpMock, url).subscribe({
      complete: () => {
        expect(localStorage.getItem(`${url}-last-modified`)).toBe('Thu, 02 Jan 2025 00:00:00 GMT');
        done();
      },
    });
  });
});
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

Run: `cd core/src/app/shared/wm-core && npx ng test --watch=false --browsers=ChromeHeadless --include='**/utils/api-cache-handler.spec.ts'`

Expected: FAIL — i primi 4 test falliscono perché oggi l'header viene inviato in base alla sola presenza di `cachedLastModified`, non alla validità di `parsedData`/al flag `forceFreshRequest` (che non esiste ancora, causando un errore di tipo in compilazione); l'ultimo test su `setItem` che rigetta fallisce perché oggi la scrittura di `localStorage` non è condizionata all'esito di `setItem`.

- [ ] **Step 3: Implementa il fix in `api-cache-handler.ts`**

Sostituisci l'intero contenuto del file con:

```ts
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {synchronizedApi} from '@wm-core/utils/localForage';
import {distinctUntilChanged, shareReplay, take} from 'rxjs/operators';

export function handleApiCache<T>(
  http: HttpClient,
  url: string,
  updateData: (data: T) => void = (data: T) => {},
  headers: any = {},
  forceFreshRequest: boolean = false,
): Observable<T> {
  return new Observable<T>(observer => {
    synchronizedApi.getItem(`${url}`).then((cachedData: string | null) => {
      let parsedData: T | null = null;
      const cachedLastModified = localStorage.getItem(`${url}-last-modified`);

      if (cachedData) {
        try {
          parsedData = JSON.parse(cachedData) as T;
          observer.next(parsedData);
        } catch (e) {
          console.warn('Error parsing cached data. Ignoring cache.', e);
        }
      }

      const requestHeaders =
        parsedData != null && !forceFreshRequest && cachedLastModified
          ? {'If-Modified-Since': cachedLastModified, ...headers}
          : headers;

      http
        .get<T>(url, {
          observe: 'response',
          headers: requestHeaders,
        })
        .pipe(take(1))
        .subscribe(
          async response => {
            const lastModified = response.headers.get('last-modified');

            if (response.status === 200) {
              const data = {...response.body};
              if (data) {
                updateData(data);
                try {
                  await synchronizedApi.setItem(`${url}`, JSON.stringify(data));
                  if (lastModified) {
                    localStorage.setItem(`${url}-last-modified`, lastModified);
                  }
                } catch (e) {
                  console.warn('Error writing cache. Skipping last-modified update.', e);
                }
                observer.next(data);
              }
            } else if (response.status === 304) {
              console.log('No changes detected, using cached data.');
            }
            observer.complete();
          },
          error => {
            if (!parsedData) {
              observer.error(error);
            } else {
              observer.complete();
            }
          },
        );
    });
  }).pipe(
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    shareReplay(1),
  );
}
```

Nota: la condizione per inviare `If-Modified-Since` ora richiede **tutte e tre**: `parsedData != null` (cache presente e valida), `!forceFreshRequest` (nessun override che forza sempre dati freschi) e `cachedLastModified` (il timestamp esiste). La scrittura di `synchronizedApi.setItem` è `await`-ata dentro un `try/catch`: se rigetta, il blocco `catch` logga un warning e **non** scrive `localStorage`; `observer.next(data)` viene comunque emesso subito dopo, indipendentemente dall'esito della cache locale, perché l'app deve ricevere comunque il dato fresco arrivato dal server.

- [ ] **Step 4: Esegui i test e verifica che passino**

Run: `cd core/src/app/shared/wm-core && npx ng test --watch=false --browsers=ChromeHeadless --include='**/utils/api-cache-handler.spec.ts'`

Expected: PASS — tutti e 6 i test verdi.

- [ ] **Step 5: Commit**

```bash
git add core/src/app/shared/wm-core/projects/wm-core/src/utils/api-cache-handler.ts core/src/app/shared/wm-core/projects/wm-core/src/utils/api-cache-handler.spec.ts
git commit -m "fix(oc:8374): non inviare If-Modified-Since su cache assente o corrotta"
```

---

### Task 2: `ConfService.getConf()` — rimuovi la costruzione autonoma dell'header, usa `forceFreshRequest` per `carg`

**Files:**
- Modify: `core/src/app/shared/wm-core/projects/wm-core/src/store/conf/conf.service.ts`
- Test: `core/src/app/shared/wm-core/projects/wm-core/src/store/conf/conf.service.spec.ts` (nuovo)

**Interfaces:**
- Consumes: `handleApiCache<T>(http, url, updateData?, headers?, forceFreshRequest?)` dal Task 1 — in particolare il 5° parametro `forceFreshRequest: boolean`.
- Produce: nessuna nuova interfaccia esposta ad altri task; `ConfService.getConf(): Observable<ICONF>` mantiene la stessa firma pubblica.

Contenuto attuale del file (per riferimento, righe 1-59):

```ts
import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {ICONF} from '../../types/config';
import {DeviceService} from '@wm-core/services/device.service';
import {EnvironmentService} from '@wm-core/services/environment.service';
import {handleApiCache} from '@wm-core/utils/api-cache-handler';
@Injectable({
  providedIn: 'root',
})
export class ConfService {
  private _geohubAppId: number = this._environmentSvc.appId;

  public get configUrl(): string {
    return `${this._geohubApiBaseUrl}config`;
  }

  public get geohubAppId(): number {
    return this._geohubAppId;
  }

  public get vectorLayerUrl(): string {
    return `${this._environmentSvc.origin}/api/app/webapp/${this._geohubAppId}/vector_layer`;
  }

  public get vectorStyleUrl(): string {
    return `${this._geohubApiBaseUrl}vector_style`;
  }

  private get _geohubApiBaseUrl(): string {
    return `${this._environmentSvc.origin}/api/app/webmapp/${this._geohubAppId}/`;
  }

  constructor(
    private _http: HttpClient,
    private _deviceSvc: DeviceService,
    private _environmentSvc: EnvironmentService,
  ) {
    this._geohubAppId = this._environmentSvc.appId;
  }

  public getConf(): Observable<ICONF> {
    const url = this._environmentSvc.confUrl;

    return handleApiCache<ICONF>(
      this._http,
      url,
      (data: ICONF) => {
        data.isMobile = this._deviceSvc?.isMobile ?? false;
      },
      this._environmentSvc.shardName === 'carg'
        ? {}
        : (() => {
            const lastModified = localStorage.getItem(`${url}-last-modified`);
            return lastModified ? {'If-Modified-Since': lastModified} : {};
          })(),
    );
  }
}
```

- [ ] **Step 1: Scrivi i test (falliranno finché il file non viene modificato)**

Crea `core/src/app/shared/wm-core/projects/wm-core/src/store/conf/conf.service.spec.ts`:

```ts
import {HttpClient, HttpHeaders, HttpResponse} from '@angular/common/http';
import {of} from 'rxjs';
import {ConfService} from './conf.service';
import {DeviceService} from '@wm-core/services/device.service';
import {EnvironmentService} from '@wm-core/services/environment.service';
import {synchronizedApi} from '@wm-core/utils/localForage';

describe('ConfService — getConf() conditional header regression (oc:8374)', () => {
  const confUrl = 'https://example.com/api/app/webmapp/1/config';

  afterEach(() => {
    localStorage.clear();
  });

  function buildService(shardName: string): {service: ConfService; httpGetSpy: jasmine.Spy} {
    const httpGetSpy = jasmine.createSpy('get');
    const httpMock = {get: httpGetSpy} as unknown as HttpClient;

    const deviceStub = {isMobile: false} as unknown as DeviceService;
    const environmentStub = {
      confUrl,
      shardName,
      appId: 1,
    } as unknown as EnvironmentService;

    const service = new ConfService(httpMock, deviceStub, environmentStub);
    return {service, httpGetSpy};
  }

  it('does not send If-Modified-Since for a non-carg shard when cache is empty', done => {
    spyOn(synchronizedApi, 'getItem').and.returnValue(Promise.resolve(null));
    spyOn(synchronizedApi, 'setItem').and.returnValue(Promise.resolve());
    localStorage.setItem(`${confUrl}-last-modified`, 'Wed, 01 Jan 2025 00:00:00 GMT');

    const {service, httpGetSpy} = buildService('geohub');
    httpGetSpy.and.returnValue(
      of(new HttpResponse({status: 200, body: {some: 'conf'}, headers: new HttpHeaders()})),
    );

    service.getConf().subscribe({
      complete: () => {
        const callArgs = httpGetSpy.calls.mostRecent().args[1];
        expect(callArgs.headers['If-Modified-Since']).toBeUndefined();
        done();
      },
    });
  });

  it('still sends If-Modified-Since for a non-carg shard when a valid cache entry exists', done => {
    spyOn(synchronizedApi, 'getItem').and.returnValue(
      Promise.resolve(JSON.stringify({some: 'cached-conf'})),
    );
    spyOn(synchronizedApi, 'setItem').and.returnValue(Promise.resolve());
    localStorage.setItem(`${confUrl}-last-modified`, 'Wed, 01 Jan 2025 00:00:00 GMT');

    const {service, httpGetSpy} = buildService('geohub');
    httpGetSpy.and.returnValue(of(new HttpResponse({status: 304, headers: new HttpHeaders()})));

    service.getConf().subscribe({
      complete: () => {
        const callArgs = httpGetSpy.calls.mostRecent().args[1];
        expect(callArgs.headers['If-Modified-Since']).toBe('Wed, 01 Jan 2025 00:00:00 GMT');
        done();
      },
    });
  });

  it('never sends If-Modified-Since for the carg shard, even with a valid cache entry (existing behavior preserved)', done => {
    spyOn(synchronizedApi, 'getItem').and.returnValue(
      Promise.resolve(JSON.stringify({some: 'cached-conf'})),
    );
    spyOn(synchronizedApi, 'setItem').and.returnValue(Promise.resolve());
    localStorage.setItem(`${confUrl}-last-modified`, 'Wed, 01 Jan 2025 00:00:00 GMT');

    const {service, httpGetSpy} = buildService('carg');
    httpGetSpy.and.returnValue(
      of(new HttpResponse({status: 200, body: {some: 'fresh-conf'}, headers: new HttpHeaders()})),
    );

    service.getConf().subscribe({
      complete: () => {
        const callArgs = httpGetSpy.calls.mostRecent().args[1];
        expect(callArgs.headers['If-Modified-Since']).toBeUndefined();
        done();
      },
    });
  });
});
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

Run: `cd core/src/app/shared/wm-core && npx ng test --watch=false --browsers=ChromeHeadless --include='**/store/conf/conf.service.spec.ts'`

Expected: FAIL — il primo test fallisce perché oggi `conf.service.ts` costruisce l'header da `localStorage` a prescindere dalla cache reale in `synchronizedApi`, quindi l'header viene inviato anche a cache vuota.

- [ ] **Step 3: Implementa il fix in `conf.service.ts`**

Applica questa modifica al metodo `getConf()` (l'unico punto toccato, righe 42-58 del file attuale):

```ts
  public getConf(): Observable<ICONF> {
    const url = this._environmentSvc.confUrl;

    return handleApiCache<ICONF>(
      this._http,
      url,
      (data: ICONF) => {
        data.isMobile = this._deviceSvc?.isMobile ?? false;
      },
      {},
      this._environmentSvc.shardName === 'carg',
    );
  }
```

Il resto del file (import, proprietà, costruttore, gli altri getter) resta invariato.

- [ ] **Step 4: Esegui i test e verifica che passino**

Run: `cd core/src/app/shared/wm-core && npx ng test --watch=false --browsers=ChromeHeadless --include='**/store/conf/conf.service.spec.ts'`

Expected: PASS — tutti e 3 i test verdi.

- [ ] **Step 5: Esegui l'intera suite di wm-core per verificare l'assenza di regressioni**

Run: `cd core/src/app/shared/wm-core && npx ng test --watch=false --browsers=ChromeHeadless`

Expected: PASS — inclusi i test del Task 1 e tutti gli altri spec preesistenti (nessuna regressione, in particolare su `icons.service.ts` che riusa `handleApiCache` senza passare il nuovo parametro).

- [ ] **Step 6: Commit**

```bash
git add core/src/app/shared/wm-core/projects/wm-core/src/store/conf/conf.service.ts core/src/app/shared/wm-core/projects/wm-core/src/store/conf/conf.service.spec.ts
git commit -m "fix(oc:8374): ConfService.getConf() delega ad handleApiCache la decisione sull'header condizionale"
```

---

## Verifica manuale finale (facoltativa, oltre ai test automatici)

Per riprodurre lo scenario originale in DevTools (Chrome), utile prima di chiudere il ticket:

1. Aprire l'app su uno shard non-`carg`, lasciare che la config si carichi normalmente.
2. In DevTools → Application → IndexedDB → database `synchronized` → object store `api`, eliminare manualmente la entry corrispondente all'URL della config (simula una cache IndexedDB persa/corrotta pur avendo ancora il `last-modified` in `localStorage`).
3. Ricaricare l'app: prima del fix, la richiesta di rete (tab Network) avrebbe mostrato ancora `If-Modified-Since` e una risposta 304 con l'app che resta vuota; dopo il fix, la richiesta non deve avere l'header condizionale e deve tornare una risposta 200 con il body completo.
