> Ticket: oc:8166

# Passaporto camminatore: validazione credenziale cartacea — piano di implementazione

> **Per chi esegue:** sub-skill richiesta `superpowers:subagent-driven-development` (consigliata) o
> `superpowers:executing-plans`, un task alla volta. I passi usano le checkbox (`- [ ]`).
>
> **Nessun commit, `git add`, push o branch automatico.** I blocchi «Commit» sono istruzioni
> testuali per il developer, che committa dopo aver letto il diff.

**Obiettivo:** nell'istanza camminiditalia (app e webapp) un badge di avanzamento nella home del
layer apre un dettaglio del cammino da cui l'utente loggato invia una richiesta di certificazione
con le foto della credenziale cartacea; tutto su un service mockato.

**Architettura:** una cartella `passport/` in wm-core con un service unico (mock dichiarato),
tre componenti — badge, dettaglio, form — e una modale host con `ion-nav`. Il badge è montato
solo nel template proprio della variante `home-layer.component.camminiditalia`. I tipi del
contratto API stanno in wm-types. `WmImagePickerComponent` e `CameraService` ricevono una
correzione e dei parametri opzionali, con default invariati.

**Tech stack:** Angular 20, Ionic 8, Capacitor 7 (`@capacitor/camera`), NgRx, ngx-translate
(tramite `LangService` e il pipe `wmtrans`), Karma + Jasmine.

**Spec:** [overview.md](overview.md) di wm-core e
`wm-types/docs/features/8166-passaporto-camminatore-validazione-credenziale-cartacea/overview.md`.

## Vincoli globali

- **La UI segue il wireframe** pubblicato su https://webmappsrl.github.io/webmapp-app/index.html
  (copia nel repo: `webmapp-app/docs/features/passaporto-camminatore-wireframe.html`), flusso
  «Validazione credenziale cartacea»: V0b per il badge nella home del layer, V1 per il dettaglio
  con la CTA, V2 per il form, V3 per lo stato «In revisione». Testi, ordine degli elementi e
  gerarchia visiva vanno ripresi da lì; gli stili indicati nei task sono un punto di partenza da
  allineare al wireframe. L'unico punto superato è il seriale: nel wireframe è obbligatorio per
  i nuovi cammini, qui è **sempre opzionale** (decisione del 03/09). Il massimo di 6 foto
  coincide con il wireframe, ma sta in una costante.
- Branch: `Passaporto` in webmapp-app e wm-core (già attivo); in wm-types va creato prima del
  Task 1. Il lavoro si unisce al resto solo quando è testato e completo, backend compreso.
- Il template condiviso `home/home-layer/home-layer.component.html` e
  `home-layer-base.component.ts` **non si modificano**.
- Foto: minimo **1**, massimo **6** (`PASSPORT_MAX_PHOTOS`), acquisite a **1600px** di larghezza
  e **`quality` 80**, senza accendere il GPS; il salvataggio in galleria resta.
- Il campo di testo (seriale o altre informazioni) è **opzionale**.
- Invio solo online, errore generico «riprova», nessuna coda offline, nessuna persistenza delle
  foto fra sessioni.
- Stati della richiesta usati in questo ciclo: `none`, `pending`. Niente `approved`/`rejected`.
- Il mock è dichiarato come tale nel codice, con un commento che rimanda al ticket backend.
- Tipi senza prefisso `I` (convenzione di wm-types, e il team la sta abbandonando anche altrove).
- Ogni stringa nuova ha la chiave in italiano e la traduzione in tutti i sette file di
  `localization/i18n/` (it, en, de, fr, pr, es, sq).
- Documentazione e commenti in italiano; JSDoc su funzioni e metodi.

## Da controllare in review

1. **Selezione multipla dalla galleria oltre il limite** — scegliendo 10 foto con 4 posti liberi
   ne entrano 4, mai di più. Test nel Task 3.
2. **Back hardware di Android dal form** — torna al dettaglio, non chiude la modale; con foto non
   inviate chiede conferma. Test nel Task 8 (logica di `canLeave` e del gestore del back).
3. **Reload dopo l'invio** — il dettaglio riaperto mostra ancora «In revisione». Test nel Task 4
   (il `localStorage` sopravvive a una nuova istanza del service).
4. **Utente che si slogga con la modale aperta** — l'invio non parte e il form mostra il blocco
   di consenso o login invece di un errore generico. Test nel Task 8.
5. **Layer senza track o con conteggio non ancora caricato** — il badge non compare e non mostra
   «0/0». Test nel Task 6.

---

### Task 1: tipi del contratto in wm-types

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-1)

**Repo:** wm-types (`core/src/app/shared/wm-types`)

**File:**
- Crea: `src/passport.ts`
- Modifica: `src/index.ts`

**Interfacce:**
- Produce: `PassportStageStatus`, `PassportStage`, `PassportProgress`,
  `PassportCertificationStatus`, `PassportCertification`, `PassportCertificationRequest`,
  esportati da `@wm-types/passport`.

- [ ] **Passo 0: branch**

```bash
cd core/src/app/shared/wm-types
git status   # attenzione: src/environment.ts ha già una modifica non legata a questo lavoro
git checkout -b Passaporto
```

La modifica preesistente su `src/environment.ts` non va inclusa nei commit di questo ticket.

- [ ] **Passo 1: scrivere i tipi**

```ts
// src/passport.ts
/**
 * Contratto API del passaporto del camminatore (oc:8166).
 *
 * Il backend camminiditalia non esiste ancora: questi tipi descrivono il contratto ipotizzato
 * dal frontend e sono la base del ticket backend collegato. Coprono solo gli stati usati in
 * questo ciclo: approvazione e rifiuto arriveranno con i ticket successivi.
 */

/** Stato di una tappa (track del layer) per l'utente corrente. */
export type PassportStageStatus = 'completed' | 'in_progress' | 'not_started';

/** Una tappa del cammino con il suo stato di avanzamento. */
export interface PassportStage {
  trackId: number;
  name: string;
  status: PassportStageStatus;
  /** Data ISO 8601 del completamento, presente solo se `status === 'completed'`. */
  completedAt?: string;
  /** Percentuale 0-100, presente solo se `status === 'in_progress'`. */
  percent?: number;
}

/** Avanzamento di un cammino (layer) per l'utente corrente. */
export interface PassportProgress {
  layerId: number;
  totalStages: number;
  completedStages: number;
  /** Percentuale intera 0-100. */
  percent: number;
  stages: PassportStage[];
}

/** Stato della richiesta di certificazione: `none` = nessuna richiesta inviata. */
export type PassportCertificationStatus = 'none' | 'pending';

/** Risposta di `GET /api/layer/{layer}/certification` e di `POST` sulla stessa rotta. */
export interface PassportCertification {
  layerId: number;
  status: PassportCertificationStatus;
  /** Data ISO 8601 dell'invio, presente solo se `status === 'pending'`. */
  submittedAt?: string;
}

/** Corpo di `POST /api/layer/{layer}/certification`, inviato come multipart. */
export interface PassportCertificationRequest {
  layerId: number;
  /** Da 1 a 6 immagini della credenziale cartacea (`images[]` nel multipart). */
  photos: Blob[];
  /** Seriale o altre informazioni identificative, opzionale (`notes` nel multipart). */
  notes?: string;
  /** Accettazione del disclaimer (`disclaimer_accepted` nel multipart). */
  disclaimerAccepted: true;
}
```

- [ ] **Passo 2: export**

Aggiungi in coda a `src/index.ts`:

```ts
export * from './passport';
```

- [ ] **Passo 3: compilare**

Run: `cd core/src/app/shared/wm-types && npm run build`
Atteso: nessun errore.

- [ ] **Passo 4: commit (istruzione per il developer)**

```bash
git add src/passport.ts src/index.ts docs/features/8166-passaporto-camminatore-validazione-credenziale-cartacea/
git commit -m "feat(oc:8166): tipi del contratto API del passaporto"
```

---

### Task 2: opzioni di acquisizione in `CameraService`

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-2)

**Repo:** wm-core. Tutti i percorsi sono relativi a `projects/wm-core/src/`.

**File:**
- Modifica: `services/camera.service.ts` (`shotPhoto`, righe 320-350 circa)
- Test: `services/camera.service.spec.ts` (crealo se non esiste)

**Interfacce:**
- Produce: `export interface ShotPhotoOptions {quality?: number; startNavigation?: boolean; saveToGallery?: boolean}`
  e la firma `shotPhoto(maxWidth?: number, options?: ShotPhotoOptions): Promise<Photo>`. I default
  (`quality: 90`, GPS avviato, `saveToGallery: true`) restano quelli di oggi.
- `getPhotos(dateLimit, options)` accetta già `Partial<GalleryImageOptions>`: `width`, `quality`
  e `limit` si passano da lì, senza modifiche.

- [ ] **Passo 1: test che fallisce**

```ts
// services/camera.service.spec.ts
import {Camera} from '@capacitor/camera';
import {CameraService} from './camera.service';

describe('CameraService.shotPhoto — opzioni (oc:8166)', () => {
  let svc: CameraService;
  let geoSpy: any;

  beforeEach(() => {
    geoSpy = {active: false, startNavigation: jasmine.createSpy('startNavigation').and.resolveTo()};
    const deviceSvc = {isBrowser: true} as any;
    const langSvc = {instant: (k: string) => k} as any;
    svc = Object.create(CameraService.prototype);
    (svc as any)._geoLocationSvc = geoSpy;
    (svc as any)._deviceSvc = deviceSvc;
    (svc as any)._lanSvc = langSvc;
    spyOn(Camera, 'getPhoto').and.resolveTo({webPath: null} as any);
  });

  it('senza opzioni avvia il GPS e usa quality 90, come oggi', async () => {
    await svc.shotPhoto();
    expect(geoSpy.startNavigation).toHaveBeenCalled();
    expect((Camera.getPhoto as jasmine.Spy).calls.mostRecent().args[0].quality).toBe(90);
  });

  it('con startNavigation false non avvia il GPS e applica quality e width', async () => {
    await svc.shotPhoto(1600, {quality: 80, startNavigation: false});
    expect(geoSpy.startNavigation).not.toHaveBeenCalled();
    const args = (Camera.getPhoto as jasmine.Spy).calls.mostRecent().args[0];
    expect(args.quality).toBe(80);
    expect(args.width).toBe(1600);
    expect(args.saveToGallery).toBe(true);
  });
});
```

Se il costruttore reale di `CameraService` usa nomi diversi per i service iniettati
(`_geoLocationSvc`, `_deviceSvc`, `_lanSvc`), allinea i nomi nel test a quelli del file.

- [ ] **Passo 2: verificare che fallisca**

Run: `cd core/src/app/shared/wm-core && npx ng test wm-core --watch=false --include='**/camera.service.spec.ts'`
Atteso: FAIL sul secondo caso (il GPS viene avviato, `quality` è 90).

- [ ] **Passo 3: implementazione**

In `services/camera.service.ts`, sopra la classe:

```ts
/** Opzioni di `shotPhoto()`; i default riproducono il comportamento precedente a oc:8166. */
export interface ShotPhotoOptions {
  quality?: number;
  /** Se `false` lo scatto non avvia la geolocalizzazione. Default `true`. */
  startNavigation?: boolean;
  saveToGallery?: boolean;
}
```

E in `shotPhoto`:

```ts
  async shotPhoto(maxWidth?: number, options: ShotPhotoOptions = {}): Promise<Photo> {
    const {quality = 90, startNavigation = true, saveToGallery = true} = options;
    if (startNavigation && !this._geoLocationSvc.active) await this._geoLocationSvc.startNavigation();
    const photo: Photo = await Camera.getPhoto({
      quality,
      resultType: CameraResultType.Uri,
      saveToGallery,
      ...(maxWidth != null && {width: maxWidth}),
      // ...le altre proprietà restano invariate
```

Aggiorna il JSDoc del metodo con i due parametri.

- [ ] **Passo 4: verificare che passi**

Stesso comando del passo 2. Atteso: PASS.

- [ ] **Passo 5: commit (istruzione per il developer)**

```bash
git add projects/wm-core/src/services/camera.service.ts projects/wm-core/src/services/camera.service.spec.ts
git commit -m "feat(oc:8166): opzioni di qualità e GPS per lo scatto in CameraService"
```

---

### Task 3: limite reale e opzioni di acquisizione in `WmImagePickerComponent`

**File:**
- Modifica: `image-picker/image-picker.component.ts`
- Test: `image-picker/image-picker.component.spec.ts` (crealo se non esiste)

**Interfacce:**
- Consuma: `ShotPhotoOptions` e la nuova firma di `shotPhoto` (Task 2).
- Produce: `@Input() captureOptions: PickerCaptureOptions | null` con
  `export interface PickerCaptureOptions {maxWidth?: number; quality?: number; startNavigation?: boolean}`
  esportata dallo stesso file. Default `null`: comportamento invariato per gli UGC.
- Comportamento: il numero di foto locali non supera mai `maxPhotos`, né da fotocamera né da
  galleria, anche con selezione multipla.

- [ ] **Passo 1: test che falliscono**

```ts
// image-picker/image-picker.component.spec.ts
import {WmImagePickerComponent} from './image-picker.component';

describe('WmImagePickerComponent — limite foto (oc:8166)', () => {
  let cmp: WmImagePickerComponent;
  let cameraSvc: jasmine.SpyObj<any>;

  const photo = (n: number) => ({webPath: `blob:${n}`}) as any;

  beforeEach(() => {
    cameraSvc = jasmine.createSpyObj('CameraService', ['getPhotos', 'getPhotoData', 'shotPhoto']);
    // ogni foto ha dati diversi, così la deduplica md5 non interferisce
    cameraSvc.getPhotoData.and.callFake(async (p: string) => p);
    cmp = new WmImagePickerComponent(cameraSvc, {markForCheck() {}} as any, {dispatch() {}} as any, {isBrowser: true} as any);
    cmp.maxPhotos = 6;
  });

  it('con 4 posti liberi e 10 foto scelte ne aggiunge 4', async () => {
    (cmp as any)._localPhotos$.next([photo(100), photo(101)]);
    cameraSvc.getPhotos.and.resolveTo(Array.from({length: 10}, (_, i) => photo(i)));

    await cmp.addPhotosFromLibrary();

    expect((cmp as any)._localPhotos$.value.length).toBe(6);
  });

  it('passa a pickImages un limit pari ai posti rimasti', async () => {
    (cmp as any)._localPhotos$.next([photo(100)]);
    cameraSvc.getPhotos.and.resolveTo([]);

    await cmp.addPhotosFromLibrary();

    expect(cameraSvc.getPhotos.calls.mostRecent().args[1].limit).toBe(5);
  });

  it('takePhoto non aggiunge oltre il massimo', async () => {
    (cmp as any)._localPhotos$.next(Array.from({length: 6}, (_, i) => photo(i)));
    cameraSvc.shotPhoto.and.resolveTo(photo(99));

    await cmp.takePhoto();

    expect(cameraSvc.shotPhoto).not.toHaveBeenCalled();
    expect((cmp as any)._localPhotos$.value.length).toBe(6);
  });

  it('con captureOptions passa larghezza, qualità e GPS a fotocamera e galleria', async () => {
    cmp.captureOptions = {maxWidth: 1600, quality: 80, startNavigation: false};
    cameraSvc.shotPhoto.and.resolveTo(photo(1));
    cameraSvc.getPhotos.and.resolveTo([]);

    await cmp.takePhoto();
    await cmp.addPhotosFromLibrary();

    expect(cameraSvc.shotPhoto).toHaveBeenCalledWith(1600, {quality: 80, startNavigation: false});
    expect(cameraSvc.getPhotos.calls.mostRecent().args[1]).toEqual(
      jasmine.objectContaining({width: 1600, quality: 80}),
    );
  });

  it('senza captureOptions chiama shotPhoto come prima', async () => {
    cameraSvc.shotPhoto.and.resolveTo(photo(1));
    await cmp.takePhoto();
    expect(cameraSvc.shotPhoto).toHaveBeenCalledWith(undefined, undefined);
  });
});
```

Allinea l'ordine degli argomenti di `new WmImagePickerComponent(...)` al costruttore reale.

- [ ] **Passo 2: verificare che falliscano**

Run: `npx ng test wm-core --watch=false --include='**/image-picker.component.spec.ts'`
Atteso: FAIL sui primi quattro casi.

- [ ] **Passo 3: implementazione**

```ts
/** Opzioni di acquisizione delle foto; `null` mantiene il comportamento di default. */
export interface PickerCaptureOptions {
  maxWidth?: number;
  quality?: number;
  startNavigation?: boolean;
}
```

Nella classe:

```ts
  @Input() captureOptions: PickerCaptureOptions | null = null;

  /**
   * Aggiunge foto dalla galleria senza mai superare `maxPhotos`.
   * Il controllo sulla lunghezza avviene al momento dell'inserimento, leggendo il valore
   * corrente: con la selezione multipla più elementi vengono elaborati in parallelo, e uno
   * snapshot letto prima degli `await` lascerebbe passare foto oltre il limite (oc:8166).
   */
  async addPhotosFromLibrary(): Promise<void> {
    this.startAddPhotos.emit();
    const freeSlots = this.maxPhotos - this._localPhotos$.value.length;
    if (freeSlots <= 0) {
      this.endAddPhotos.emit();
      return;
    }
    const {maxWidth, quality} = this.captureOptions ?? {};
    const library = await this._cameraSvc.getPhotos(null, {
      limit: freeSlots,
      ...(maxWidth != null && {width: maxWidth}),
      ...(quality != null && {quality}),
    });

    await Promise.all(
      library.map(async libraryItem => {
        const libraryItemCopy = Object.assign({selected: false}, libraryItem);
        const photoData = await this._cameraSvc.getPhotoData(libraryItemCopy.webPath);
        const md5 = Md5.hashStr(JSON.stringify(photoData));
        const exists = await this._isDuplicate(md5);
        const current = this._localPhotos$.value;
        if (!exists && current.length < this.maxPhotos) {
          this._localPhotos$.next([...current, libraryItemCopy]);
        }
      }),
    );

    this.endAddPhotos.emit();
  }

  /**
   * Scatta una foto e la aggiunge, solo se c'è ancora posto.
   */
  async takePhoto(): Promise<void> {
    if (this._localPhotos$.value.length >= this.maxPhotos) return;
    const {maxWidth, ...shotOptions} = this.captureOptions ?? {};
    const photo = this.captureOptions
      ? await this._cameraSvc.shotPhoto(maxWidth, shotOptions)
      : await this._cameraSvc.shotPhoto(undefined, undefined);
    const current = this._localPhotos$.value;
    if (current.length < this.maxPhotos) {
      this._localPhotos$.next([...current, photo]);
    }
  }

  /**
   * Indica se fra le foto locali ne esiste già una con lo stesso hash dei dati.
   *
   * @param md5 Hash dei dati della foto candidata.
   */
  private async _isDuplicate(md5: string): Promise<boolean> {
    for (const p of this._localPhotos$.value) {
      if (p.id) continue;
      const pData = await this._cameraSvc.getPhotoData(p.webPath);
      if (Md5.hashStr(JSON.stringify(pData)) === md5) return true;
    }
    return false;
  }
```

Mantieni il test sulla deduplica esistente, se c'è: la logica è la stessa, solo estratta.

- [ ] **Passo 4: verificare che passino**

Stesso comando del passo 2, poi l'intera suite: `npx ng test wm-core --watch=false`.
Atteso: PASS, nessuna regressione negli spec UGC.

- [ ] **Passo 5: commit (istruzione per il developer)**

```bash
git add projects/wm-core/src/image-picker/
git commit -m "fix(oc:8166): il picker non supera più il massimo di foto con la selezione multipla"
```

---

### Task 4: `PassportService` mockato

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-4)

**File:**
- Crea: `passport/passport.constants.ts`
- Crea: `passport/passport.service.ts`
- Test: `passport/passport.service.spec.ts`

**Interfacce:**
- Consuma: i tipi di `@wm-types/passport` (Task 1); `layerFeaturesTotalCount` da
  `@wm-core/store/features/ec/ec.selector`.
- Produce:
  - `PASSPORT_MAX_PHOTOS = 6`, `PASSPORT_MIN_PHOTOS = 1`,
    `PASSPORT_PHOTO_CAPTURE = {maxWidth: 1600, quality: 80, startNavigation: false}`,
    `PASSPORT_MOCK_STORAGE_KEY = 'wm-passport-mock-certifications'`.
  - `PassportService` (`providedIn: 'root'`) con:
    - `getProgress(layerId: number): Observable<PassportProgress>`
    - `getCertification(layerId: number): Observable<PassportCertification>`
    - `submitCertification(req: PassportCertificationRequest): Observable<PassportCertification>`
    - `resetMock(): void` e `simulateSubmitError: boolean` (solo mock), raggiungibili da console
      come `wmPassportMock` per la verifica manuale.

- [ ] **Passo 1: costanti**

```ts
// passport/passport.constants.ts
import {PickerCaptureOptions} from '@wm-core/image-picker/image-picker.component';

/** Foto minime obbligatorie nella richiesta di certificazione (oc:8166). */
export const PASSPORT_MIN_PHOTOS = 1;
/** Foto massime nella richiesta di certificazione: si cambia qui (oc:8166). */
export const PASSPORT_MAX_PHOTOS = 6;
/** Acquisizione delle foto della credenziale: ridotte e senza accendere il GPS. */
export const PASSPORT_PHOTO_CAPTURE: PickerCaptureOptions = {
  maxWidth: 1600,
  quality: 80,
  startNavigation: false,
};
/** Chiave `localStorage` del mock delle richieste inviate. Sparisce con il backend reale. */
export const PASSPORT_MOCK_STORAGE_KEY = 'wm-passport-mock-certifications';
```

- [ ] **Passo 2: test che falliscono**

```ts
// passport/passport.service.spec.ts
import {of, firstValueFrom} from 'rxjs';
import {PassportService} from './passport.service';
import {PASSPORT_MOCK_STORAGE_KEY} from './passport.constants';

describe('PassportService (mock, oc:8166)', () => {
  let svc: PassportService;
  const counts = {'3': {tracks: 12}, '4': {tracks: 30}, '5': {tracks: 6}, '9': {tracks: 0}};

  function create(): PassportService {
    const store = {select: () => of(counts)} as any;
    return new PassportService(store);
  }

  beforeEach(() => {
    localStorage.removeItem(PASSPORT_MOCK_STORAGE_KEY);
    svc = create();
  });

  it('il progresso è deterministico e copre 0%, parziale e 100%', async () => {
    const p3 = await firstValueFrom(svc.getProgress(3));
    const p4 = await firstValueFrom(svc.getProgress(4));
    const p5 = await firstValueFrom(svc.getProgress(5));
    expect(p3.percent).toBe(0);
    expect(p4.percent).toBeGreaterThan(0);
    expect(p4.percent).toBeLessThan(100);
    expect(p5.percent).toBe(100);
    expect(p4.stages.length).toBe(30);
    expect(await firstValueFrom(svc.getProgress(4))).toEqual(p4);
  });

  it('un layer senza track ha totalStages 0', async () => {
    const p = await firstValueFrom(svc.getProgress(9));
    expect(p.totalStages).toBe(0);
    expect(p.stages).toEqual([]);
  });

  it('senza invii lo stato è none', async () => {
    const c = await firstValueFrom(svc.getCertification(3));
    expect(c.status).toBe('none');
  });

  it("dopo l'invio lo stato è pending, anche per una nuova istanza (reload)", async () => {
    await firstValueFrom(svc.submitCertification({layerId: 3, photos: [new Blob()], disclaimerAccepted: true}));
    const c = await firstValueFrom(create().getCertification(3));
    expect(c.status).toBe('pending');
    expect(c.submittedAt).toBeTruthy();
    expect((await firstValueFrom(create().getCertification(4))).status).toBe('none');
  });

  it('simulateSubmitError fa fallire l\'invio senza salvare', async () => {
    svc.simulateSubmitError = true;
    await expectAsync(
      firstValueFrom(svc.submitCertification({layerId: 3, photos: [new Blob()], disclaimerAccepted: true})),
    ).toBeRejected();
    expect((await firstValueFrom(svc.getCertification(3))).status).toBe('none');
  });

  it('resetMock cancella le richieste salvate', async () => {
    await firstValueFrom(svc.submitCertification({layerId: 3, photos: [new Blob()], disclaimerAccepted: true}));
    svc.resetMock();
    expect((await firstValueFrom(svc.getCertification(3))).status).toBe('none');
  });
});
```

- [ ] **Passo 3: verificare che falliscano**

Run: `npx ng test wm-core --watch=false --include='**/passport.service.spec.ts'`
Atteso: FAIL, `PassportService` non esiste.

- [ ] **Passo 4: implementazione**

```ts
// passport/passport.service.ts
import {Injectable} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable, of, throwError} from 'rxjs';
import {delay, map, take} from 'rxjs/operators';
import {layerFeaturesTotalCount} from '@wm-core/store/features/ec/ec.selector';
import {
  PassportCertification,
  PassportCertificationRequest,
  PassportProgress,
  PassportStage,
} from '@wm-types/passport';
import {PASSPORT_MOCK_STORAGE_KEY} from './passport.constants';

/** Latenza simulata delle chiamate mock, per vedere loader e stati intermedi. */
const MOCK_LATENCY_MS = 400;

/**
 * Service del passaporto del camminatore (oc:8166).
 *
 * ⚠️ MOCK: il backend camminiditalia non esiste ancora. Tutte le operazioni sono simulate e
 * verranno sostituite dall'implementazione reale (chiamate HTTP verso `EnvironmentService.origin`)
 * con il ticket backend collegato a oc:8166. Il contratto è in `@wm-types/passport`; componenti e
 * store non devono cambiare quando si sostituisce questo service.
 *
 * Contratto ipotizzato:
 * - progresso: `GET /api/layer/{layer}/progress`
 * - stato richiesta: `GET /api/layer/{layer}/certification`
 * - invio: `POST /api/layer/{layer}/certification` (multipart: `images[]`, `notes`, `disclaimer_accepted`)
 */
@Injectable({providedIn: 'root'})
export class PassportService {
  /** Solo mock: se `true` il prossimo invio fallisce, per provare lo stato di errore. */
  simulateSubmitError = false;

  constructor(private _store: Store) {
    // Solo mock: accesso da console per la verifica manuale (simulateSubmitError, resetMock).
    (globalThis as any).wmPassportMock = this;
  }

  /**
   * Avanzamento del cammino per l'utente corrente.
   * MOCK: il totale delle tappe è il numero reale di track del layer; le tappe percorse
   * dipendono dall'id del layer (resto della divisione per 3: 0%, parziale, 100%).
   *
   * @param layerId Id del layer (cammino).
   */
  getProgress(layerId: number): Observable<PassportProgress> {
    return this._store.select(layerFeaturesTotalCount).pipe(
      take(1),
      map(counts => this._mockProgress(layerId, counts?.[layerId]?.tracks ?? 0)),
      delay(MOCK_LATENCY_MS),
    );
  }

  /**
   * Stato della richiesta di certificazione per il layer.
   * MOCK: legge le richieste inviate da `localStorage`.
   *
   * @param layerId Id del layer (cammino).
   */
  getCertification(layerId: number): Observable<PassportCertification> {
    const submittedAt = this._readMock()[layerId];
    const res: PassportCertification = submittedAt
      ? {layerId, status: 'pending', submittedAt}
      : {layerId, status: 'none'};
    return of(res).pipe(delay(MOCK_LATENCY_MS));
  }

  /**
   * Invia la richiesta di certificazione.
   * MOCK: non invia nulla, salva in `localStorage` la data di invio per il layer.
   *
   * @param req Richiesta con foto, note opzionali e accettazione del disclaimer.
   */
  submitCertification(req: PassportCertificationRequest): Observable<PassportCertification> {
    if (this.simulateSubmitError) {
      return throwError(() => new Error('Invio simulato fallito (mock oc:8166)')).pipe(
        delay(MOCK_LATENCY_MS),
      );
    }
    const submittedAt = new Date().toISOString();
    this._writeMock({...this._readMock(), [req.layerId]: submittedAt});
    return of<PassportCertification>({layerId: req.layerId, status: 'pending', submittedAt}).pipe(
      delay(MOCK_LATENCY_MS),
    );
  }

  /** Solo mock: cancella le richieste simulate salvate. */
  resetMock(): void {
    localStorage.removeItem(PASSPORT_MOCK_STORAGE_KEY);
  }

  /**
   * Costruisce un avanzamento fittizio e deterministico.
   *
   * @param layerId Id del layer.
   * @param total Numero di track del layer.
   */
  private _mockProgress(layerId: number, total: number): PassportProgress {
    const bucket = Number(layerId) % 3;
    const completed = bucket === 0 ? 0 : bucket === 1 ? Math.round(total * 0.64) : total;
    const stages: PassportStage[] = Array.from({length: total}, (_, i) => {
      const n = String(i + 1).padStart(2, '0');
      if (i < completed) {
        return {trackId: i + 1, name: `Tappa ${n}`, status: 'completed', completedAt: '2026-05-12'};
      }
      if (i === completed && completed > 0) {
        return {trackId: i + 1, name: `Tappa ${n}`, status: 'in_progress', percent: 60};
      }
      return {trackId: i + 1, name: `Tappa ${n}`, status: 'not_started'};
    });
    const percent = total ? Math.round((completed / total) * 100) : 0;
    return {layerId: Number(layerId), totalStages: total, completedStages: completed, percent, stages};
  }

  /** Solo mock: legge la mappa layerId → data di invio. */
  private _readMock(): Record<number, string> {
    try {
      return JSON.parse(localStorage.getItem(PASSPORT_MOCK_STORAGE_KEY) ?? '{}');
    } catch {
      return {};
    }
  }

  /**
   * Solo mock: salva la mappa layerId → data di invio.
   *
   * @param value Mappa da salvare.
   */
  private _writeMock(value: Record<number, string>): void {
    localStorage.setItem(PASSPORT_MOCK_STORAGE_KEY, JSON.stringify(value));
  }
}
```

- [ ] **Passo 5: verificare che passino**

Stesso comando del passo 3. Atteso: PASS.

- [ ] **Passo 6: commit (istruzione per il developer)**

```bash
git add projects/wm-core/src/passport/
git commit -m "feat(oc:8166): PassportService mockato con progresso e stato della certificazione"
```

---

### Task 5: chiavi i18n

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-5)

**File:** modifica i sette file `localization/i18n/{it,en,de,fr,pr,es,sq}.ts`, aggiungendo le chiavi
in coda all'oggetto (prima di `};`).

Le chiavi con `{{…}}` usano l'interpolazione di ngx-translate, passata dal pipe
(`'…'|wmtrans:{percent: 64}`). `Annulla` ed `Esci` esistono già e non si aggiungono.

| Chiave | it | en | de | fr | pr (pt) | es | sq |
|---|---|---|---|---|---|---|---|
| `passport.badge.percent` | `{{percent}}% completato` | `{{percent}}% completed` | `{{percent}}% abgeschlossen` | `{{percent}}% terminé` | `{{percent}}% concluído` | `{{percent}}% completado` | `{{percent}}% përfunduar` |
| `passport.badge.stages` | `{{completed}}/{{total}} tappe percorse · tocca per i dettagli` | `{{completed}}/{{total}} stages walked · tap for details` | `{{completed}}/{{total}} Etappen gegangen · für Details tippen` | `{{completed}}/{{total}} étapes parcourues · touchez pour les détails` | `{{completed}}/{{total}} etapas percorridas · toque para ver detalhes` | `{{completed}}/{{total}} etapas recorridas · toca para ver detalles` | `{{completed}}/{{total}} etapa të përshkuara · prek për detaje` |
| `passport.detail.count` | `{{completed}} di {{total}} tappe` | `{{completed}} of {{total}} stages` | `{{completed}} von {{total}} Etappen` | `{{completed}} sur {{total}} étapes` | `{{completed}} de {{total}} etapas` | `{{completed}} de {{total}} etapas` | `{{completed}} nga {{total}} etapa` |
| `passport.detail.none` | `Nessuna tappa registrata via GPS` | `No stage recorded via GPS` | `Keine Etappe per GPS aufgezeichnet` | `Aucune étape enregistrée par GPS` | `Nenhuma etapa registrada por GPS` | `Ninguna etapa registrada por GPS` | `Asnjë etapë e regjistruar me GPS` |
| `passport.detail.remaining` | `Completa le restanti {{remaining}} per sbloccare il timbro` | `Complete the remaining {{remaining}} to unlock the stamp` | `Schließe die restlichen {{remaining}} ab, um den Stempel freizuschalten` | `Termine les {{remaining}} restantes pour débloquer le tampon` | `Conclua as {{remaining}} restantes para desbloquear o carimbo` | `Completa las {{remaining}} restantes para desbloquear el sello` | `Përfundo {{remaining}} e mbetura për të zhbllokuar vulën` |
| `passport.detail.completed` | `Cammino completato` | `Trail completed` | `Weg abgeschlossen` | `Chemin terminé` | `Caminho concluído` | `Camino completado` | `Rruga u përfundua` |
| `passport.stage.completed` | `percorsa il {{date}}` | `walked on {{date}}` | `gegangen am {{date}}` | `parcourue le {{date}}` | `percorrida em {{date}}` | `recorrida el {{date}}` | `përshkuar më {{date}}` |
| `passport.stage.notStarted` | `non ancora percorsa` | `not walked yet` | `noch nicht gegangen` | `pas encore parcourue` | `ainda não percorrida` | `aún no recorrida` | `ende e papërshkuar` |
| `passport.cta.title` | `Richiedi certificazione` | `Request certification` | `Zertifizierung anfordern` | `Demander la certification` | `Solicitar certificação` | `Solicitar certificación` | `Kërko certifikimin` |
| `passport.cta.hint` | `Hai timbrato la credenziale cartacea? Carica la foto per validare il cammino` | `Did you stamp your paper credential? Upload a photo to validate the trail` | `Hast du deinen Pilgerpass abstempeln lassen? Lade ein Foto hoch, um den Weg zu bestätigen` | `As-tu fait tamponner ta crédentiale papier ? Charge une photo pour valider le chemin` | `Carimbou a credencial em papel? Envie a foto para validar o caminho` | `¿Has sellado la credencial en papel? Sube la foto para validar el camino` | `E ke vulosur kredencialin në letër? Ngarko foton për të vërtetuar rrugën` |
| `passport.pending.title` | `In revisione` | `Under review` | `In Prüfung` | `En cours de vérification` | `Em análise` | `En revisión` | `Në shqyrtim` |
| `passport.pending.hint` | `Inviata il {{date}} — riceverai un esito via email` | `Sent on {{date}} — you will receive the outcome by email` | `Gesendet am {{date}} — du erhältst das Ergebnis per E-Mail` | `Envoyée le {{date}} — tu recevras la réponse par e-mail` | `Enviada em {{date}} — receberá o resultado por e-mail` | `Enviada el {{date}} — recibirás el resultado por email` | `Dërguar më {{date}} — do të marrësh përgjigjen me email` |
| `passport.form.intro` | `Carica una o più foto della credenziale cartacea timbrata alle tappe percorse. La richiesta verrà revisionata dal gestore del cammino.` | `Upload one or more photos of the paper credential stamped at the stages you walked. The trail manager will review the request.` | `Lade ein oder mehrere Fotos des an den Etappen abgestempelten Pilgerpasses hoch. Der Betreiber des Weges prüft die Anfrage.` | `Charge une ou plusieurs photos de la crédentiale papier tamponnée aux étapes parcourues. Le gestionnaire du chemin examinera la demande.` | `Envie uma ou mais fotos da credencial em papel carimbada nas etapas percorridas. O gestor do caminho analisará o pedido.` | `Sube una o más fotos de la credencial en papel sellada en las etapas recorridas. El gestor del camino revisará la solicitud.` | `Ngarko një ose më shumë foto të kredencialit në letër të vulosur në etapat e përshkuara. Menaxheri i rrugës do ta shqyrtojë kërkesën.` |
| `passport.form.photos` | `Foto credenziale` | `Credential photos` | `Fotos des Pilgerpasses` | `Photos de la crédentiale` | `Fotos da credencial` | `Fotos de la credencial` | `Foto të kredencialit` |
| `passport.form.notes` | `Seriale o altre informazioni` | `Serial number or other information` | `Seriennummer oder weitere Angaben` | `Numéro de série ou autres informations` | `Número de série ou outras informações` | `Número de serie u otra información` | `Numri serial ose informacione të tjera` |
| `passport.form.notesHint` | `Facoltativo: il numero seriale della credenziale, se c'è, o informazioni utili al gestore` | `Optional: the credential serial number, if any, or information useful to the manager` | `Optional: die Seriennummer des Pilgerpasses, falls vorhanden, oder nützliche Angaben für den Betreiber` | `Facultatif : le numéro de série de la crédentiale, s'il existe, ou des informations utiles au gestionnaire` | `Opcional: o número de série da credencial, se houver, ou informações úteis ao gestor` | `Opcional: el número de serie de la credencial, si existe, o información útil para el gestor` | `Opsionale: numri serial i kredencialit, nëse ka, ose informacione të dobishme për menaxherin` |
| `passport.form.disclaimer` | `[TESTO SEGNAPOSTO — da sostituire con il disclaimer legale] Accetto che nome, cognome e foto della credenziale siano trattati per validare il cammino.` | `[PLACEHOLDER — to be replaced with the legal disclaimer] I accept that my name, surname and credential photos are processed to validate the trail.` | `[PLATZHALTER — durch den rechtlichen Hinweis zu ersetzen] Ich akzeptiere, dass Name, Nachname und Fotos des Pilgerpasses zur Bestätigung des Weges verarbeitet werden.` | `[TEXTE PROVISOIRE — à remplacer par la mention légale] J'accepte que mes nom, prénom et photos de la crédentiale soient traités pour valider le chemin.` | `[TEXTO PROVISÓRIO — a substituir pelo aviso legal] Aceito que nome, apelido e fotos da credencial sejam tratados para validar o caminho.` | `[TEXTO PROVISIONAL — a sustituir por el aviso legal] Acepto que nombre, apellido y fotos de la credencial se traten para validar el camino.` | `[TEKST I PËRKOHSHËM — do të zëvendësohet me njoftimin ligjor] Pranoj që emri, mbiemri dhe fotot e kredencialit të përpunohen për të vërtetuar rrugën.` |
| `passport.form.submit` | `Invia richiesta` | `Send request` | `Anfrage senden` | `Envoyer la demande` | `Enviar pedido` | `Enviar solicitud` | `Dërgo kërkesën` |
| `passport.form.errorPhotos` | `Aggiungi almeno una foto della credenziale` | `Add at least one photo of the credential` | `Füge mindestens ein Foto des Pilgerpasses hinzu` | `Ajoute au moins une photo de la crédentiale` | `Adicione pelo menos uma foto da credencial` | `Añade al menos una foto de la credencial` | `Shto të paktën një foto të kredencialit` |
| `passport.form.errorDisclaimer` | `Accetta il disclaimer per inviare la richiesta` | `Accept the disclaimer to send the request` | `Akzeptiere den Hinweis, um die Anfrage zu senden` | `Accepte la mention pour envoyer la demande` | `Aceite o aviso para enviar o pedido` | `Acepta el aviso para enviar la solicitud` | `Prano njoftimin për të dërguar kërkesën` |
| `passport.form.sent` | `Richiesta inviata` | `Request sent` | `Anfrage gesendet` | `Demande envoyée` | `Pedido enviado` | `Solicitud enviada` | `Kërkesa u dërgua` |
| `passport.form.error` | `Invio non riuscito, riprova` | `Sending failed, please try again` | `Senden fehlgeschlagen, bitte erneut versuchen` | `Échec de l'envoi, réessaie` | `Falha no envio, tente novamente` | `Error en el envío, inténtalo de nuevo` | `Dërgimi dështoi, provo përsëri` |
| `passport.form.leave` | `Hai foto non inviate. Vuoi uscire e perderle?` | `You have unsent photos. Leave and lose them?` | `Du hast nicht gesendete Fotos. Verlassen und verwerfen?` | `Tu as des photos non envoyées. Quitter et les perdre ?` | `Tem fotos não enviadas. Sair e perdê-las?` | `Tienes fotos sin enviar. ¿Salir y perderlas?` | `Ke foto të padërguara. Të dalësh dhe t'i humbasësh?` |

- [ ] **Passo 1:** aggiungi le 23 chiavi in ciascuno dei sette file, con la colonna corrispondente.
- [ ] **Passo 2:** verifica che nessuna chiave manchi:

```bash
cd projects/wm-core/src/localization/i18n
for f in it en de fr pr es sq; do echo "$f $(grep -c "'passport\." $f.ts)"; done
```

Atteso: `23` per ogni file.

- [ ] **Passo 3: commit (istruzione per il developer)**

```bash
git add projects/wm-core/src/localization/i18n/
git commit -m "feat(oc:8166): testi del passaporto in tutte le lingue"
```

---

### Task 6: badge di avanzamento e template della variante camminiditalia

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-6)

**File:**
- Crea: `passport/passport-progress-badge/passport-progress-badge.component.{ts,html,scss,spec.ts}`
- Crea: `home/home-layer/home-layer.component.camminiditalia.html`
- Modifica: `home/home-layer/home-layer.component.camminiditalia.ts` (solo `templateUrl`)
- Modifica: `home/home-layer/home-layer.component.camminiditalia.spec.ts`
- Modifica: `wm-core.module.ts` (array `declarations`)

**Interfacce:**
- Consuma: `PassportService.getProgress` (Task 4); `isLogged`; `openPassportDetail` (Task 7) —
  in questo task il tap chiama un metodo `openDetail()` che nel Task 7 apre la modale.
- Produce: `<wm-passport-progress-badge [layerId]="…" [layerTitle]="…">`, classe
  `WmPassportProgressBadgeComponent` con `vm$: Observable<PassportBadgeVm | null>` e
  `openDetail(): Promise<void>`.

- [ ] **Passo 1: test che falliscono**

```ts
// passport/passport-progress-badge/passport-progress-badge.component.spec.ts
import {firstValueFrom, of} from 'rxjs';
import {WmPassportProgressBadgeComponent} from './passport-progress-badge.component';

describe('WmPassportProgressBadgeComponent (oc:8166)', () => {
  function create(logged: boolean, progress: any) {
    const store = {select: () => of(logged)} as any;
    const passportSvc = {getProgress: () => of(progress)} as any;
    const cmp = new WmPassportProgressBadgeComponent(store, passportSvc, {} as any);
    cmp.layerId = 4;
    cmp.ngOnChanges();
    return cmp;
  }

  it('utente loggato con track: mostra percentuale e tappe', async () => {
    const vm = await firstValueFrom(create(true, {totalStages: 30, completedStages: 19, percent: 63}).vm$);
    expect(vm).toEqual({percent: 63, completed: 19, total: 30});
  });

  it('utente non loggato: nessun badge', async () => {
    expect(await firstValueFrom(create(false, {totalStages: 30, completedStages: 0, percent: 0}).vm$)).toBeNull();
  });

  it('layer senza track: nessun badge, mai «0/0»', async () => {
    expect(await firstValueFrom(create(true, {totalStages: 0, completedStages: 0, percent: 0}).vm$)).toBeNull();
  });
});
```

Nel file spec della variante (`home-layer.component.camminiditalia.spec.ts`) aggiungi, sotto la
riga esistente:

```ts
describe('WmHomeLayerComponent (camminiditalia) — template (oc:8166)', () => {
  it('usa il template proprio della variante', () => {
    const meta = (WmHomeLayerComponent as any).ɵcmp;
    expect(meta).toBeDefined();
    expect(meta.selectors[0][0]).toBe('wm-home-layer');
  });
});
```

(il template proprio si verifica anche a mano nel Task 9: gli spec in stile `new` non
compilano i template.)

- [ ] **Passo 2: verificare che falliscano**

Run: `npx ng test wm-core --watch=false --include='**/passport-progress-badge.component.spec.ts'`
Atteso: FAIL, il componente non esiste.

- [ ] **Passo 3: componente**

```ts
// passport/passport-progress-badge/passport-progress-badge.component.ts
import {ChangeDetectionStrategy, Component, Input, OnChanges, ViewEncapsulation} from '@angular/core';
import {ModalController} from '@ionic/angular';
import {Store} from '@ngrx/store';
import {combineLatest, Observable, of} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';
import {isLogged} from '@wm-core/store/auth/auth.selectors';
import {PassportService} from '../passport.service';

/** Dati mostrati dal badge. */
export interface PassportBadgeVm {
  percent: number;
  completed: number;
  total: number;
}

/**
 * Badge di avanzamento del cammino nella home del layer camminiditalia (oc:8166).
 * Autonomo: si inietta da sé service e store, così la variante di `wm-home-layer` non tocca il
 * costruttore della classe base.
 */
@Component({
  standalone: false,
  selector: 'wm-passport-progress-badge',
  templateUrl: './passport-progress-badge.component.html',
  styleUrls: ['./passport-progress-badge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmPassportProgressBadgeComponent implements OnChanges {
  @Input() layerId: number;
  @Input() layerTitle: string;

  vm$: Observable<PassportBadgeVm | null> = of(null);

  constructor(
    private _store: Store,
    private _passportSvc: PassportService,
    private _modalCtrl: ModalController,
  ) {}

  /** Ricalcola i dati del badge quando cambia il layer. */
  ngOnChanges(): void {
    this.vm$ = this._store.select(isLogged).pipe(
      switchMap(logged =>
        logged && this.layerId != null ? this._passportSvc.getProgress(this.layerId) : of(null),
      ),
      map(p =>
        p && p.totalStages > 0
          ? {percent: p.percent, completed: p.completedStages, total: p.totalStages}
          : null,
      ),
    );
  }

  /** Apre il dettaglio del cammino. Implementato nel Task 7. */
  async openDetail(): Promise<void> {}
}
```

```html
<!-- passport/passport-progress-badge/passport-progress-badge.component.html -->
<button
  *ngIf="vm$ | async as vm"
  type="button"
  class="wm-passport-progress-badge"
  (click)="openDetail()"
>
  <span class="wm-passport-progress-badge-percent">
    {{ 'passport.badge.percent' | wmtrans: {percent: vm.percent} }}
  </span>
  <span class="wm-passport-progress-badge-stages">
    {{ 'passport.badge.stages' | wmtrans: {completed: vm.completed, total: vm.total} }}
  </span>
</button>
```

```scss
// passport/passport-progress-badge/passport-progress-badge.component.scss
// Badge del wireframe V0b: riquadro verde chiaro con bordo tratteggiato.
wm-passport-progress-badge .wm-passport-progress-badge {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: calc(100% - 32px);
  min-height: 44px;
  margin: 12px 16px;
  padding: 10px 14px;
  border: 1.5px dashed var(--ion-color-success, #2dd36f);
  border-radius: 10px;
  background: rgba(45, 211, 111, 0.08);
  text-align: left;
  font: inherit;
}

wm-passport-progress-badge .wm-passport-progress-badge-percent {
  font-weight: 700;
  font-size: 16px;
  color: var(--ion-color-success-shade, #1e7a3c);
}

wm-passport-progress-badge .wm-passport-progress-badge-stages {
  font-size: 13px;
  color: var(--ion-color-success-shade, #1e7a3c);
}
```

- [ ] **Passo 4: template della variante**

Crea `home/home-layer/home-layer.component.camminiditalia.html` copiando **per intero**
`home-layer.component.html` e aggiungendo il badge dopo `</wm-img>`. In testa al file:

```html
<!--
  Variante camminiditalia di wm-home-layer (oc:8166), sullo schema di search-bar:
  copia di home-layer.component.html più il badge del passaporto.
  Le correzioni al template di default vanno riportate anche qui.
-->
```

E dopo `</wm-img>`:

```html
  <wm-passport-progress-badge
    [layerId]="layer.id"
    [layerTitle]="layer.title | wmtrans"
  ></wm-passport-progress-badge>
```

In `home-layer.component.camminiditalia.ts` cambia soltanto:

```ts
  templateUrl: './home-layer.component.camminiditalia.html',
```

Se `layer.id` in `ILAYER` è una stringa, converti con un `Number(...)` nel componente
(`@Input() set layerId`), non nel template.

- [ ] **Passo 5: dichiarazione**

In `wm-core.module.ts` importa `WmPassportProgressBadgeComponent` e aggiungilo all'array
`declarations`.

- [ ] **Passo 6: verificare**

Run: `npx ng test wm-core --watch=false`
Atteso: PASS, compresi gli spec preferiti di entrambe le varianti.

- [ ] **Passo 7: commit (istruzione per il developer)**

```bash
git add projects/wm-core/src/passport/passport-progress-badge/ projects/wm-core/src/home/home-layer/ projects/wm-core/src/wm-core.module.ts
git commit -m "feat(oc:8166): badge di avanzamento nella home del layer camminiditalia"
```

---

### Task 7: modale con `ion-nav` e dettaglio del cammino

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-7)

**File:**
- Crea: `passport/passport-modal/passport-modal.component.{ts,html}`
- Crea: `passport/passport-detail/passport-detail.component.{ts,html,scss,spec.ts}`
- Modifica: `passport/passport-progress-badge/passport-progress-badge.component.ts` (`openDetail`)
- Modifica: `wm-core.module.ts`

**Interfacce:**
- Consuma: `PassportService.getProgress`, `getCertification` (Task 4).
- Produce:
  - `WmPassportModalComponent` (`wm-passport-modal`), input `layerId`, `layerTitle`; espone
    `openForm()`, `back()`, `close()`, `backToDetail()` (tutti `Promise<void>`) e
    `registerGuard(guard: PassportLeaveGuard | null): void`; esporta l'interfaccia
    `PassportLeaveGuard {canLeave(): Promise<boolean>}`.
  - `WmPassportDetailComponent` (`wm-passport-detail`), input `layerId`, `layerTitle`, `host`
    (il `WmPassportModalComponent`); `vm$: Observable<PassportDetailVm>`; `refresh(): void`.
  - `PassportDetailVm = {progress: PassportProgress; certification: PassportCertification; showCta: boolean}`.

- [ ] **Passo 1: test che falliscono**

```ts
// passport/passport-detail/passport-detail.component.spec.ts
import {firstValueFrom, of} from 'rxjs';
import {WmPassportDetailComponent} from './passport-detail.component';

describe('WmPassportDetailComponent (oc:8166)', () => {
  function create(progress: any, certification: any) {
    const svc = {
      getProgress: jasmine.createSpy().and.returnValue(of(progress)),
      getCertification: jasmine.createSpy().and.returnValue(of(certification)),
    } as any;
    const cmp = new WmPassportDetailComponent(svc);
    cmp.layerId = 3;
    cmp.ngOnInit();
    return {cmp, svc};
  }

  const partial = {totalStages: 12, completedStages: 0, percent: 0, stages: []};
  const done = {totalStages: 6, completedStages: 6, percent: 100, stages: []};

  it("all'apertura verifica lo stato della richiesta", async () => {
    const {cmp, svc} = create(partial, {status: 'none'});
    await firstValueFrom(cmp.vm$);
    expect(svc.getCertification).toHaveBeenCalledWith(3);
  });

  it('nessuna richiesta e cammino non completato: mostra la CTA', async () => {
    const vm = await firstValueFrom(create(partial, {status: 'none'}).cmp.vm$);
    expect(vm.showCta).toBeTrue();
  });

  it('richiesta in attesa: niente CTA', async () => {
    const vm = await firstValueFrom(create(partial, {status: 'pending', submittedAt: '2026-09-28'}).cmp.vm$);
    expect(vm.showCta).toBeFalse();
    expect(vm.certification.status).toBe('pending');
  });

  it('cammino completato: niente CTA', async () => {
    const vm = await firstValueFrom(create(done, {status: 'none'}).cmp.vm$);
    expect(vm.showCta).toBeFalse();
  });

  it('refresh rilegge lo stato della richiesta', async () => {
    const {cmp, svc} = create(partial, {status: 'none'});
    await firstValueFrom(cmp.vm$);
    cmp.refresh();
    await firstValueFrom(cmp.vm$);
    expect(svc.getCertification).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Passo 2: verificare che falliscano**

Run: `npx ng test wm-core --watch=false --include='**/passport-detail.component.spec.ts'`
Atteso: FAIL.

- [ ] **Passo 3: dettaglio**

```ts
// passport/passport-detail/passport-detail.component.ts
import {ChangeDetectionStrategy, Component, Input, OnInit, ViewEncapsulation} from '@angular/core';
import {combineLatest, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {PassportCertification, PassportProgress} from '@wm-types/passport';
import {PassportService} from '../passport.service';

/** Dati del dettaglio del cammino. */
export interface PassportDetailVm {
  progress: PassportProgress;
  certification: PassportCertification;
  /** CTA visibile solo se il cammino non è completato e non c'è una richiesta in attesa. */
  showCta: boolean;
}

/**
 * Dettaglio del cammino nel passaporto (oc:8166, wireframe V1/V3): radice dell'`ion-nav`
 * della modale. All'apertura verifica se esiste una richiesta di certificazione inviata.
 */
@Component({
  standalone: false,
  selector: 'wm-passport-detail',
  templateUrl: './passport-detail.component.html',
  styleUrls: ['./passport-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmPassportDetailComponent implements OnInit {
  @Input() layerId: number;
  @Input() layerTitle: string;
  /** Modale host, per aprire il form e chiudere. */
  @Input() host: {openForm: () => Promise<void>; close: () => Promise<void>};

  vm$: Observable<PassportDetailVm>;

  constructor(private _passportSvc: PassportService) {}

  /** Carica progresso e stato della richiesta. */
  ngOnInit(): void {
    this.refresh();
  }

  /** Rilegge progresso e stato della richiesta, per esempio dopo un invio. */
  refresh(): void {
    this.vm$ = combineLatest([
      this._passportSvc.getProgress(this.layerId),
      this._passportSvc.getCertification(this.layerId),
    ]).pipe(
      map(([progress, certification]) => ({
        progress,
        certification,
        showCta: progress.percent < 100 && certification.status === 'none',
      })),
    );
  }

  /** Ionic chiama questo hook quando il dettaglio torna in primo piano nell'`ion-nav`. */
  ionViewWillEnter(): void {
    this.refresh();
  }
}
```

```html
<!-- passport/passport-detail/passport-detail.component.html -->
<ion-header>
  <ion-toolbar>
    <ion-buttons slot="start">
      <ion-button (click)="host?.close()" [attr.aria-label]="'Chiudi' | wmtrans">
        <ion-icon slot="icon-only" name="arrow-back"></ion-icon>
      </ion-button>
    </ion-buttons>
    <ion-title>{{ layerTitle }}</ion-title>
  </ion-toolbar>
</ion-header>

<ion-content class="wm-passport-detail">
  <ng-container *ngIf="vm$ | async as vm; else loading">
    <div class="wm-passport-detail-summary">
      <div class="wm-passport-detail-count">
        {{ 'passport.detail.count' | wmtrans: {completed: vm.progress.completedStages, total: vm.progress.totalStages} }}
      </div>
      <div class="wm-passport-detail-subtitle">
        <ng-container *ngIf="vm.progress.percent === 100; else notDone">
          {{ 'passport.detail.completed' | wmtrans }}
        </ng-container>
        <ng-template #notDone>
          <ng-container *ngIf="vm.progress.completedStages === 0; else remaining">
            {{ 'passport.detail.none' | wmtrans }}
          </ng-container>
          <ng-template #remaining>
            {{ 'passport.detail.remaining' | wmtrans: {remaining: vm.progress.totalStages - vm.progress.completedStages} }}
          </ng-template>
        </ng-template>
      </div>
    </div>

    <button *ngIf="vm.showCta" type="button" class="wm-passport-detail-cta" (click)="host?.openForm()">
      <ion-icon name="camera-outline" aria-hidden="true"></ion-icon>
      <span class="wm-passport-detail-cta-title">{{ 'passport.cta.title' | wmtrans }}</span>
      <span class="wm-passport-detail-cta-hint">{{ 'passport.cta.hint' | wmtrans }}</span>
    </button>

    <div *ngIf="vm.certification.status === 'pending'" class="wm-passport-detail-pending" role="status">
      <ion-chip outline>
        <ion-icon name="hourglass-outline" aria-hidden="true"></ion-icon>
        <ion-label>{{ 'passport.pending.title' | wmtrans }}</ion-label>
      </ion-chip>
      <span>{{ 'passport.pending.hint' | wmtrans: {date: (vm.certification.submittedAt | date: 'dd/MM/yyyy')} }}</span>
    </div>

    <ion-list class="wm-passport-detail-stages">
      <ion-item *ngFor="let stage of vm.progress.stages; let i = index">
        <span slot="start" class="wm-passport-stage-index" [class.done]="stage.status === 'completed'">
          {{ stage.status === 'completed' ? '✓' : i + 1 }}
        </span>
        <ion-label>
          <div>{{ stage.name }}</div>
          <small [ngSwitch]="stage.status">
            <ng-container *ngSwitchCase="'completed'">
              {{ 'passport.stage.completed' | wmtrans: {date: (stage.completedAt | date: 'dd/MM/yyyy')} }}
            </ng-container>
            <ng-container *ngSwitchCase="'in_progress'">{{ stage.percent }}%</ng-container>
            <ng-container *ngSwitchDefault>{{ 'passport.stage.notStarted' | wmtrans }}</ng-container>
          </small>
        </ion-label>
      </ion-item>
    </ion-list>
  </ng-container>
  <ng-template #loading>
    <div class="wm-passport-detail-loading"><ion-spinner></ion-spinner></div>
  </ng-template>
</ion-content>
```

Se la chiave `Chiudi` non esiste in `i18n/it.ts`, aggiungila nei sette file come nel Task 5.

```scss
// passport/passport-detail/passport-detail.component.scss
.wm-passport-detail-summary { padding: 16px; }
.wm-passport-detail-count { font-size: 20px; font-weight: 700; }
.wm-passport-detail-subtitle { color: var(--ion-color-medium); margin-top: 4px; }
.wm-passport-detail-cta {
  display: grid;
  grid-template-columns: 24px 1fr;
  gap: 4px 10px;
  width: calc(100% - 32px);
  min-height: 44px;
  margin: 0 16px 16px;
  padding: 12px 14px;
  border: 1.5px dashed var(--ion-color-success, #2dd36f);
  border-radius: 10px;
  background: rgba(45, 211, 111, 0.08);
  text-align: left;
  font: inherit;
}
.wm-passport-detail-cta ion-icon { grid-row: span 2; font-size: 22px; }
.wm-passport-detail-cta-title { font-weight: 700; }
.wm-passport-detail-cta-hint { font-size: 13px; color: var(--ion-color-medium); }
.wm-passport-detail-pending { display: flex; flex-direction: column; gap: 4px; padding: 0 16px 16px; }
.wm-passport-stage-index { min-width: 24px; text-align: center; font-weight: 700; }
.wm-passport-stage-index.done { color: var(--ion-color-success); }
.wm-passport-detail-loading { display: flex; justify-content: center; padding: 32px; }
```

- [ ] **Passo 4: modale host**

```ts
// passport/passport-modal/passport-modal.component.ts
import {AfterViewInit, ChangeDetectionStrategy, Component, Input, OnDestroy, ViewChild, ViewEncapsulation} from '@angular/core';
import {IonNav, ModalController, Platform} from '@ionic/angular';
import {Subscription} from 'rxjs';
import {WmPassportDetailComponent} from '../passport-detail/passport-detail.component';

/** Componente in cima all'`ion-nav` che può impedire l'uscita (il form con foto non inviate). */
export interface PassportLeaveGuard {
  canLeave(): Promise<boolean>;
}

/**
 * Modale a tutto schermo del passaporto (oc:8166): `ion-nav` con il dettaglio come radice e il
 * form spinto sopra. Il back hardware di Android dal form torna al dettaglio invece di chiudere la
 * modale, e ogni uscita passa dal `canLeave()` del componente in primo piano.
 */
@Component({
  standalone: false,
  selector: 'wm-passport-modal',
  templateUrl: './passport-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmPassportModalComponent implements AfterViewInit, OnDestroy {
  @Input() layerId: number;
  @Input() layerTitle: string;
  @ViewChild(IonNav) nav: IonNav;

  readonly root = WmPassportDetailComponent;
  /** Priorità sopra quella di chiusura degli overlay di Ionic (100). */
  static readonly BACK_PRIORITY = 101;

  private _backSub: Subscription;
  private _guard: PassportLeaveGuard | null = null;

  constructor(private _modalCtrl: ModalController, private _platform: Platform) {}

  /** Parametri passati al dettaglio radice. */
  get rootParams() {
    return {layerId: this.layerId, layerTitle: this.layerTitle, host: this};
  }

  /** Registra il gestore del back hardware. */
  ngAfterViewInit(): void {
    this._backSub = this._platform.backButton.subscribeWithPriority(
      WmPassportModalComponent.BACK_PRIORITY,
      () => this.back(),
    );
  }

  /** Apre il form di richiesta sopra il dettaglio. */
  async openForm(): Promise<void> {
    const {WmPassportFormComponent} = await import('../passport-form/passport-form.component');
    await this.nav.push(WmPassportFormComponent, {layerId: this.layerId, host: this});
  }

  /** Indietro: dal form al dettaglio, dal dettaglio chiude la modale. */
  async back(): Promise<void> {
    if (!(await this._activeCanLeave())) return;
    if (await this.nav.canGoBack()) {
      await this.nav.pop();
    } else {
      await this._modalCtrl.dismiss();
    }
  }

  /** Chiude la modale, rispettando il `canLeave()` del componente in primo piano. */
  async close(): Promise<void> {
    if (await this._activeCanLeave()) await this._modalCtrl.dismiss();
  }

  /** Torna al dettaglio senza chiedere conferma, dopo un invio riuscito. */
  async backToDetail(): Promise<void> {
    await this.nav.popToRoot();
  }

  /** Rimuove il gestore del back hardware. */
  ngOnDestroy(): void {
    this._backSub?.unsubscribe();
  }

  /**
   * Il form si registra qui per poter bloccare l'uscita.
   *
   * @param guard Componente che decide se si può uscire, o `null` per rimuoverlo.
   */
  registerGuard(guard: PassportLeaveGuard | null): void {
    this._guard = guard;
  }

  /** Chiede al guard registrato (il form, se aperto) se si può uscire. */
  private async _activeCanLeave(): Promise<boolean> {
    return this._guard ? this._guard.canLeave() : true;
  }
}
```

`ion-nav` in Ionic Angular non espone l'istanza del componente in primo piano: per questo il
form (Task 8) si registra sull'host con `registerGuard(this)` in `ngOnInit` e si toglie con
`registerGuard(null)` in `ngOnDestroy`.

```html
<!-- passport/passport-modal/passport-modal.component.html -->
<ion-nav [root]="root" [rootParams]="rootParams"></ion-nav>
```

- [ ] **Passo 5: apertura dal badge**

In `WmPassportProgressBadgeComponent`:

```ts
  /** Apre la modale a tutto schermo con il dettaglio del cammino. */
  async openDetail(): Promise<void> {
    const modal = await this._modalCtrl.create({
      component: WmPassportModalComponent,
      componentProps: {layerId: this.layerId, layerTitle: this.layerTitle},
    });
    await modal.present();
  }
```

La modale è a tutto schermo (niente `breakpoints`), quindi non c'è lo swipe verso il basso: le
uscite passano tutte da `back()` e `close()`.

- [ ] **Passo 6: dichiarazioni**

Aggiungi `WmPassportModalComponent` e `WmPassportDetailComponent` a `declarations` in
`wm-core.module.ts`.

- [ ] **Passo 7: verificare**

Run: `npx ng test wm-core --watch=false`
Atteso: PASS.

- [ ] **Passo 8: commit (istruzione per il developer)**

```bash
git add projects/wm-core/src/passport/ projects/wm-core/src/wm-core.module.ts
git commit -m "feat(oc:8166): dettaglio del cammino in modale con ion-nav"
```

---

### Task 8: form di richiesta di certificazione

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-8)

**File:**
- Crea: `passport/passport-form/passport-form.component.{ts,html,scss,spec.ts}`
- Modifica: `wm-core.module.ts`

**Interfacce:**
- Consuma: `PassportService.submitCertification`, `PASSPORT_MIN_PHOTOS`, `PASSPORT_MAX_PHOTOS`,
  `PASSPORT_PHOTO_CAPTURE` (Task 4); `WmImagePickerComponent` con `maxPhotos` e
  `captureOptions` (Task 3); `needsPrivacyAgree`, `isLogged`; `host.registerGuard`,
  `host.back`, `host.backToDetail` (Task 7).
- Produce: `WmPassportFormComponent` (`wm-passport-form`), che implementa `PassportLeaveGuard`;
  metodi `onPhotos(photos: Photo[])`, `submit(): Promise<void>`, `canLeave(): Promise<boolean>`;
  getter `canSubmit: boolean`.

- [ ] **Passo 1: test che falliscono**

```ts
// passport/passport-form/passport-form.component.spec.ts
import {of, throwError, BehaviorSubject} from 'rxjs';
import {WmPassportFormComponent} from './passport-form.component';

describe('WmPassportFormComponent (oc:8166)', () => {
  let svc: any;
  let host: any;
  let alertCtrl: any;
  let toastCtrl: any;
  let needsPrivacy$: BehaviorSubject<boolean>;
  let logged$: BehaviorSubject<boolean>;
  let confirm: boolean;

  const photo = (n: number) => ({webPath: `blob:${n}`}) as any;

  function create(): WmPassportFormComponent {
    const store = {select: (sel: any) => (sel.name === 'needsPrivacyAgree' ? needsPrivacy$ : logged$)} as any;
    const cmp = new WmPassportFormComponent(svc, store, alertCtrl, toastCtrl, {instant: (k: string) => k} as any);
    cmp.layerId = 3;
    cmp.host = host;
    (cmp as any)._toBlob = async () => new Blob();
    cmp.ngOnInit();
    return cmp;
  }

  beforeEach(() => {
    svc = {submitCertification: jasmine.createSpy().and.returnValue(of({status: 'pending'}))};
    host = {registerGuard: jasmine.createSpy(), back: jasmine.createSpy(), backToDetail: jasmine.createSpy().and.resolveTo()};
    confirm = true;
    alertCtrl = {
      create: jasmine.createSpy().and.callFake(async (opts: any) => ({
        present: async () => {},
        onDidDismiss: async () => ({role: confirm ? 'confirm' : 'cancel'}),
      })),
    };
    toastCtrl = {create: jasmine.createSpy().and.resolveTo({present: async () => {}})};
    needsPrivacy$ = new BehaviorSubject(false);
    logged$ = new BehaviorSubject(true);
  });

  it('senza foto o senza disclaimer non si può inviare', () => {
    const cmp = create();
    expect(cmp.canSubmit).toBeFalse();
    cmp.onPhotos([photo(1)]);
    expect(cmp.canSubmit).toBeFalse();
    cmp.form.controls.disclaimer.setValue(true);
    expect(cmp.canSubmit).toBeTrue();
  });

  it('oltre il massimo di foto non si può inviare', () => {
    const cmp = create();
    cmp.onPhotos(Array.from({length: 7}, (_, i) => photo(i)));
    cmp.form.controls.disclaimer.setValue(true);
    expect(cmp.canSubmit).toBeFalse();
  });

  it('il testo libero è opzionale e viene inviato se presente', async () => {
    const cmp = create();
    cmp.onPhotos([photo(1)]);
    cmp.form.controls.disclaimer.setValue(true);
    cmp.form.controls.notes.setValue('CG-2026-00341');
    await cmp.submit();
    const req = svc.submitCertification.calls.mostRecent().args[0];
    expect(req.notes).toBe('CG-2026-00341');
    expect(req.photos.length).toBe(1);
    expect(host.backToDetail).toHaveBeenCalled();
  });

  it('consenso privacy mancante: invio bloccato', async () => {
    needsPrivacy$.next(true);
    const cmp = create();
    cmp.onPhotos([photo(1)]);
    cmp.form.controls.disclaimer.setValue(true);
    expect(cmp.canSubmit).toBeFalse();
    await cmp.submit();
    expect(svc.submitCertification).not.toHaveBeenCalled();
  });

  it('utente sloggato durante la compilazione: invio bloccato', async () => {
    const cmp = create();
    cmp.onPhotos([photo(1)]);
    cmp.form.controls.disclaimer.setValue(true);
    logged$.next(false);
    await cmp.submit();
    expect(svc.submitCertification).not.toHaveBeenCalled();
  });

  it("errore d'invio: messaggio e foto conservate", async () => {
    svc.submitCertification.and.returnValue(throwError(() => new Error('x')));
    const cmp = create();
    cmp.onPhotos([photo(1), photo(2)]);
    cmp.form.controls.disclaimer.setValue(true);
    await cmp.submit();
    expect(toastCtrl.create).toHaveBeenCalledWith(jasmine.objectContaining({message: 'passport.form.error'}));
    expect(cmp.photos.length).toBe(2);
    expect(cmp.submitting).toBeFalse();
  });

  it('nessun invio doppio mentre è in corso', async () => {
    const cmp = create();
    cmp.onPhotos([photo(1)]);
    cmp.form.controls.disclaimer.setValue(true);
    const first = cmp.submit();
    await cmp.submit();
    await first;
    expect(svc.submitCertification).toHaveBeenCalledTimes(1);
  });

  it('uscita con foto non inviate: chiede conferma', async () => {
    const cmp = create();
    cmp.onPhotos([photo(1)]);
    confirm = false;
    expect(await cmp.canLeave()).toBeFalse();
    confirm = true;
    expect(await cmp.canLeave()).toBeTrue();
  });

  it('uscita senza foto: nessuna conferma', async () => {
    const cmp = create();
    expect(await cmp.canLeave()).toBeTrue();
    expect(alertCtrl.create).not.toHaveBeenCalled();
  });

  it("si registra come guard sull'host e si toglie alla distruzione", () => {
    const cmp = create();
    expect(host.registerGuard).toHaveBeenCalledWith(cmp);
    cmp.ngOnDestroy();
    expect(host.registerGuard).toHaveBeenCalledWith(null);
  });
});
```

Se il riconoscimento dei selettori nel finto `store` per nome (`sel.name`) non funziona con i
selettori NgRx, espone nel componente `needsPrivacyAgree$` e `isLogged$` come proprietà e
sostituiscile nel test dopo `create()`.

- [ ] **Passo 2: verificare che falliscano**

Run: `npx ng test wm-core --watch=false --include='**/passport-form.component.spec.ts'`
Atteso: FAIL.

- [ ] **Passo 3: implementazione**

```ts
// passport/passport-form/passport-form.component.ts
import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit, ViewEncapsulation} from '@angular/core';
import {FormControl, FormGroup} from '@angular/forms';
import {AlertController, ToastController} from '@ionic/angular';
import {Store} from '@ngrx/store';
import {Photo} from '@capacitor/camera';
import {firstValueFrom} from 'rxjs';
import {isLogged, needsPrivacyAgree} from '@wm-core/store/auth/auth.selectors';
import {LangService} from '@wm-core/localization/lang.service';
import {PassportService} from '../passport.service';
import {PASSPORT_MAX_PHOTOS, PASSPORT_MIN_PHOTOS, PASSPORT_PHOTO_CAPTURE} from '../passport.constants';
import {PassportLeaveGuard} from '../passport-modal/passport-modal.component';

/**
 * Form di richiesta di certificazione della credenziale cartacea (oc:8166, wireframe V2).
 * Invio solo online: in caso di errore le foto restano nel form. Con foto non inviate ogni
 * uscita chiede conferma.
 */
@Component({
  standalone: false,
  selector: 'wm-passport-form',
  templateUrl: './passport-form.component.html',
  styleUrls: ['./passport-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmPassportFormComponent implements OnInit, OnDestroy, PassportLeaveGuard {
  @Input() layerId: number;
  @Input() host: {
    registerGuard: (g: PassportLeaveGuard | null) => void;
    back: () => Promise<void>;
    backToDetail: () => Promise<void>;
  };

  readonly maxPhotos = PASSPORT_MAX_PHOTOS;
  readonly captureOptions = PASSPORT_PHOTO_CAPTURE;
  readonly needsPrivacyAgree$ = this._store.select(needsPrivacyAgree);
  readonly isLogged$ = this._store.select(isLogged);

  form = new FormGroup({
    notes: new FormControl<string>(''),
    disclaimer: new FormControl<boolean>(false, {nonNullable: true}),
  });
  photos: Photo[] = [];
  submitting = false;
  /** Mostra gli errori di validazione solo dopo il primo tentativo d'invio. */
  triedSubmit = false;
  private _needsPrivacy = false;
  private _logged = true;
  private _subs: {unsubscribe: () => void}[] = [];

  constructor(
    private _passportSvc: PassportService,
    private _store: Store,
    private _alertCtrl: AlertController,
    private _toastCtrl: ToastController,
    private _langSvc: LangService,
    private _cdr?: ChangeDetectorRef,
  ) {}

  /** Si registra come guard sull'host e segue consenso e login. */
  ngOnInit(): void {
    this.host?.registerGuard(this);
    this._subs.push(this.needsPrivacyAgree$.subscribe(v => (this._needsPrivacy = v)));
    this._subs.push(this.isLogged$.subscribe(v => (this._logged = v)));
  }

  /** Foto con numero valido: almeno il minimo, non oltre il massimo. */
  get photosValid(): boolean {
    return this.photos.length >= PASSPORT_MIN_PHOTOS && this.photos.length <= PASSPORT_MAX_PHOTOS;
  }

  /** Invio possibile: foto valide, disclaimer accettato, utente loggato con consenso, nessun invio in corso. */
  get canSubmit(): boolean {
    return (
      this.photosValid &&
      this.form.controls.disclaimer.value === true &&
      this._logged &&
      !this._needsPrivacy &&
      !this.submitting
    );
  }

  /**
   * Aggiorna le foto scelte nel picker.
   *
   * @param photos Foto correnti del picker.
   */
  onPhotos(photos: Photo[]): void {
    this.photos = photos ?? [];
    this._cdr?.markForCheck();
  }

  /** Invia la richiesta; in caso di errore mostra un messaggio e conserva le foto. */
  async submit(): Promise<void> {
    this.triedSubmit = true;
    if (!this.canSubmit) {
      this._cdr?.markForCheck();
      return;
    }
    this.submitting = true;
    this._cdr?.markForCheck();
    try {
      const blobs = await Promise.all(this.photos.map(p => this._toBlob(p)));
      const notes = this.form.controls.notes.value?.trim();
      await firstValueFrom(
        this._passportSvc.submitCertification({
          layerId: this.layerId,
          photos: blobs,
          ...(notes ? {notes} : {}),
          disclaimerAccepted: true,
        }),
      );
      this.photos = [];
      await this._toast('passport.form.sent');
      await this.host.backToDetail();
    } catch {
      await this._toast('passport.form.error');
    } finally {
      this.submitting = false;
      this._cdr?.markForCheck();
    }
  }

  /** Con foto non inviate chiede conferma prima di uscire. */
  async canLeave(): Promise<boolean> {
    if (this.photos.length === 0) return true;
    if (this.submitting) return false;
    const alert = await this._alertCtrl.create({
      message: this._langSvc.instant('passport.form.leave'),
      buttons: [
        {text: this._langSvc.instant('Annulla'), role: 'cancel'},
        {text: this._langSvc.instant('Esci'), role: 'confirm'},
      ],
    });
    await alert.present();
    const {role} = await alert.onDidDismiss();
    return role === 'confirm';
  }

  /** Si toglie da guard dell'host. */
  ngOnDestroy(): void {
    this.host?.registerGuard(null);
    this._subs.forEach(s => s.unsubscribe());
  }

  /**
   * Converte una foto del picker in Blob per il multipart.
   *
   * @param photo Foto Capacitor con `webPath`.
   */
  private async _toBlob(photo: Photo): Promise<Blob> {
    const res = await fetch(photo.webPath);
    return res.blob();
  }

  /**
   * Mostra un toast con il testo tradotto.
   *
   * @param key Chiave i18n.
   */
  private async _toast(key: string): Promise<void> {
    const toast = await this._toastCtrl.create({message: this._langSvc.instant(key), duration: 2500});
    await toast.present();
  }
}
```

Nel test il finto `LangService` restituisce la chiave, quindi `message: 'passport.form.error'`
è il valore atteso.

```html
<!-- passport/passport-form/passport-form.component.html -->
<ion-header>
  <ion-toolbar>
    <ion-buttons slot="start">
      <ion-button (click)="host?.back()" [attr.aria-label]="'Indietro' | wmtrans">
        <ion-icon slot="icon-only" name="arrow-back"></ion-icon>
      </ion-button>
    </ion-buttons>
    <ion-title>{{ 'passport.cta.title' | wmtrans }}</ion-title>
  </ion-toolbar>
</ion-header>

<ion-content class="wm-passport-form ion-padding">
  <p>{{ 'passport.form.intro' | wmtrans }}</p>

  <h3 class="wm-passport-form-label">
    {{ 'passport.form.photos' | wmtrans }} ({{ photos.length }}/{{ maxPhotos }}) *
  </h3>
  <wm-image-picker
    [maxPhotos]="maxPhotos"
    [captureOptions]="captureOptions"
    (photosChanged)="onPhotos($event)"
  ></wm-image-picker>
  <ion-note *ngIf="triedSubmit && !photosValid" color="danger" role="alert">
    {{ 'passport.form.errorPhotos' | wmtrans }}
  </ion-note>

  <form [formGroup]="form">
    <ion-item lines="full">
      <ion-input
        formControlName="notes"
        labelPlacement="stacked"
        [label]="'passport.form.notes' | wmtrans"
        [helperText]="'passport.form.notesHint' | wmtrans"
        placeholder="CG-2026-00341"
      ></ion-input>
    </ion-item>

    <wm-privacy-agree-button *ngIf="needsPrivacyAgree$ | async"></wm-privacy-agree-button>

    <ion-item lines="none" class="wm-passport-form-disclaimer">
      <ion-checkbox formControlName="disclaimer" labelPlacement="end" justify="start">
        <span class="ion-text-wrap">{{ 'passport.form.disclaimer' | wmtrans }}</span>
      </ion-checkbox>
    </ion-item>
    <ion-note *ngIf="triedSubmit && !form.controls.disclaimer.value" color="danger" role="alert">
      {{ 'passport.form.errorDisclaimer' | wmtrans }}
    </ion-note>
  </form>

  <ion-button expand="block" [disabled]="submitting" (click)="submit()">
    <ion-spinner *ngIf="submitting" name="crescent" slot="start"></ion-spinner>
    {{ 'passport.form.submit' | wmtrans }}
  </ion-button>
</ion-content>
```

Il pulsante resta cliccabile anche quando il form non è valido, così il tap mostra gli errori
vicino ai campi; è disabilitato solo durante l'invio. Se `Indietro` non esiste in
`i18n/it.ts`, aggiungila nei sette file.

```scss
// passport/passport-form/passport-form.component.scss
.wm-passport-form-label { font-size: 15px; font-weight: 700; margin: 16px 0 8px; }
.wm-passport-form-disclaimer { --min-height: 44px; margin-top: 12px; }
.wm-passport-form ion-note { display: block; margin: 4px 0 8px; }
.wm-passport-form ion-button { margin-top: 24px; min-height: 44px; }
```

- [ ] **Passo 4: dichiarazione**

Aggiungi `WmPassportFormComponent` a `declarations` in `wm-core.module.ts`. Verifica che
`WmImagePickerComponent` e `WmPrivacyAgreeButtonComponent` siano disponibili nel modulo che
dichiara il form (`WmImagePickerComponent` è già in `declarations`; il bottone privacy sta in
`shared.module.ts`: se `SharedModule` non è importato da `wm-core.module.ts`, importalo).

- [ ] **Passo 5: verificare**

Run: `npx ng test wm-core --watch=false`
Atteso: PASS su tutta la suite.

- [ ] **Passo 6: commit (istruzione per il developer)**

```bash
git add projects/wm-core/src/passport/ projects/wm-core/src/wm-core.module.ts
git commit -m "feat(oc:8166): form di richiesta di certificazione con foto, note e disclaimer"
```

---

### Task 9: verifica manuale, contratto nelle note, submodule

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-9)

**File:**
- Crea: `docs/features/8166-passaporto-camminatore-validazione-credenziale-cartacea/notes.md` (wm-core)

- [ ] **Passo 1: lint e build**

```bash
cd core && npm run lint
cd core && npx ng build --configuration=camminiditalia
```

Atteso: nessun errore nei file toccati.

- [ ] **Passo 2: verifica manuale nell'app**

`cd core && npx ng serve --configuration=camminiditalia`, login con un utente con consenso
privacy dato. Per ciascuno stato, apri la home di un layer e annota l'esito:

| Stato | Come ottenerlo | Atteso |
|---|---|---|
| Non loggato | logout | nessun badge |
| 0% | layer con id divisibile per 3 | badge «0% completato», dettaglio con CTA |
| Parziale | id con resto 1 | badge con percentuale, dettaglio con tappe percorse, in corso e non percorse, CTA |
| 100% | id con resto 2 | dettaglio «Cammino completato», nessuna CTA |
| Invio | CTA → 1 foto → disclaimer → invia | toast «Richiesta inviata», dettaglio «In revisione» |
| Reload | ricarica la pagina, riapri il dettaglio | ancora «In revisione» |
| Errore | da console: `wmPassportMock.simulateSubmitError = true`, poi invia | toast di errore, foto ancora nel form |
| Validazione | invia senza foto o senza disclaimer | errori vicino ai campi |
| Uscita | 2 foto, poi indietro | conferma; «Annulla» resta nel form |
| Limite | seleziona 10 foto dalla galleria | ne entrano 6 |
| Reset | da console: `wmPassportMock.resetMock()`, poi riapri il dettaglio | torna la CTA |

- [ ] **Passo 3: verifica manuale nella webapp**

Nel repo `wm-webapp`, sul branch `Passaporto`, aggiorna il submodule `wm-core` (e `wm-types`) al
commit di questo lavoro, poi `ng serve --configuration=camminiditalia`. Ripeti le righe
«0%», «Invio», «Reload», «Validazione»: la foto passa dal selettore di file del browser.

- [ ] **Passo 4: notes.md**

Scrivi `notes.md` con: il contratto API (le tre rotte, i campi del multipart, le risposte, con
rimando a `@wm-types/passport`), le decisioni prese in pianificazione (niente tag, branch
`Passaporto` al posto del flag, stima impostata dal developer a 10h, stima non indipendente
perché `wm-estimate` non stima senza piano), le deviazioni dal piano e i follow-up: ticket
backend collegato, stati `approved`/`rejected`, testo legale del disclaimer, verifica su
dispositivo.

- [ ] **Passo 5: aggiornamento dei submodule nell'app (istruzione per il developer)**

```bash
cd /Users/peco/Documents/Apps/webmapp-app
git add core/src/app/shared/wm-core core/src/app/shared/wm-types
git commit -m "chore(oc:8166): aggiorna wm-core e wm-types con il passaporto"
```

La modifica preesistente su `core/src/environments/environment.ts` non va inclusa.
