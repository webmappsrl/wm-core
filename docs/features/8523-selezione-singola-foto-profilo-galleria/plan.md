> Ticket: oc:8523

# Fix selezione foto profilo da galleria Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Far sì che il ramo "Dalla libreria" di `CameraService.addProfilePhoto()` restituisca sempre la foto effettivamente selezionata dall'utente, su tutte le piattaforme (Android, iOS, Web/PWA), eliminando il bug per cui una selezione multipla accidentale nella galleria faceva usare `photos[0]` invece dell'ultima foto toccata.

**Architecture:** Sostituire, nel solo ramo "Dalla libreria", la chiamata a `getPhotos()` (che usa `Camera.pickImages()`, un picker multi-selezione) con `Camera.getPhoto({source: CameraSource.Photos, ...})` — lo stesso metodo Capacitor già usato da `shotPhoto()` per il ramo camera, che restituisce sempre e solo un singolo `Photo` per contratto del plugin, su ogni piattaforma. `getPhotos()` resta invariato e continua a servire gli altri due consumer che fanno multi-selezione intenzionale (`addPhotos()` in questo stesso file, e `WmImagePickerComponent.addPhotosFromLibrary()`).

**Tech Stack:** Angular 20, Capacitor 7 (`@capacitor/camera`), TypeScript strict mode.

**Spec:** `core/src/app/shared/wm-core/docs/features/8523-selezione-singola-foto-profilo-galleria/overview.md`

## Global Constraints

- Unico file da modificare: `core/src/app/shared/wm-core/projects/wm-core/src/services/camera.service.ts`
- JSDoc obbligatorio su ogni funzione/metodo (enforced da ESLint, da CLAUDE.md del repo) — qualsiasi commento esistente reso impreciso dal cambiamento va aggiornato, non lasciato stale
- Nessun test automatico da aggiungere: non esiste `camera.service.spec.ts` nel repo, e il plugin Capacitor Camera non è mockabile in modo affidabile in questo scope (decisione già presa e approvata in overview.md) — la verifica è manuale su build reali (Android, iOS, Web)
- Nessuna modifica al contratto pubblico `addProfilePhoto(): Promise<Photo>`, né a `getPhotos()`, né a `addPhotos()`, né a `shotPhoto()`
- Commit con convenzione `fix(oc:8523): ...`
- **Nessun commit/branch va eseguito automaticamente da chi esegue questo piano** — ogni comando `git commit`/`git push`/`git checkout -b` elencato è un'istruzione testuale per l'operatore umano, da eseguire solo dopo conferma esplicita del developer (regola del progetto Webmapp, non della skill di esecuzione)

---

### Task 1: Sostituire il picker multi-selezione con `Camera.getPhoto()` nel ramo "Dalla libreria"

**Files:**
- Modify: `core/src/app/shared/wm-core/projects/wm-core/src/services/camera.service.ts:92-133` (metodo `addProfilePhoto()`)
- Modify: `core/src/app/shared/wm-core/projects/wm-core/src/services/camera.service.ts:221-227` (JSDoc di `getPhotos()`, reso stale dal cambiamento)

**Interfaces:**
- Consuma: `Camera.getPhoto(options: ImageOptions): Promise<Photo>` (già importato da `@capacitor/camera` in cima al file, riga 6-14: `Camera`, `CameraResultType`, `CameraSource`, `Photo` — nessun nuovo import necessario); `CameraService._sanitizeObjectValues(input: any): any` (metodo privato già esistente, righe 197-220, invariato)
- Produce: `addProfilePhoto(): Promise<Photo>` — firma pubblica invariata, consumata da `ProfileEditComponent.pickPhoto()` (`profile-edit.component.ts:114`) e da `AuthService.updateProfile()` (`auth.service.ts:109`, tramite `data.avatarPhoto`) — nessuna modifica richiesta in questi due file

- [ ] **Step 1: Leggere il metodo attuale per avere il contesto esatto**

Il metodo `addProfilePhoto()` (righe 92-133) oggi è:

```typescript
  async addProfilePhoto(): Promise<Photo> {
    return new Promise<Photo>((resolve, reject) => {
      this._actionSheetCtrl
        .create({
          header: this._lanSvc.instant("Origine dell'immagine"),
          buttons: [
            {
              text: this._lanSvc.instant('Scatta una foto'),
              handler: () => {
                this.shotPhoto(1600)
                  .then(photo => resolve(photo))
                  .catch(() => reject());
              },
            },
            {
              text: this._lanSvc.instant('Dalla libreria'),
              handler: () => {
                this.getPhotos(null, {quality: 80, width: 1600})
                  .then(photos => {
                    if (photos.length === 0) {
                      reject();
                      return;
                    }
                    resolve(photos[0]);
                  })
                  .catch(() => reject());
              },
            },
            {
              text: this._lanSvc.instant('Annulla'),
              role: 'cancel',
              handler: () => {
                reject();
              },
            },
          ],
        })
        .then(actionSheet => {
          actionSheet.present();
        });
    });
  }
```

Il branch `'Scatta una foto'` e il branch `'Annulla'` NON vanno toccati in questo task — solo il branch `'Dalla libreria'` (righe 106-118).

- [ ] **Step 2: Sostituire il branch "Dalla libreria"**

Sostituire questo blocco (righe 106-118):

```typescript
            {
              text: this._lanSvc.instant('Dalla libreria'),
              handler: () => {
                this.getPhotos(null, {quality: 80, width: 1600})
                  .then(photos => {
                    if (photos.length === 0) {
                      reject();
                      return;
                    }
                    resolve(photos[0]);
                  })
                  .catch(() => reject());
              },
            },
```

con:

```typescript
            {
              text: this._lanSvc.instant('Dalla libreria'),
              handler: () => {
                Camera.getPhoto({
                  quality: 80,
                  width: 1600,
                  resultType: CameraResultType.Uri,
                  source: CameraSource.Photos,
                  webUseInput: this._deviceSvc.isBrowser ? undefined : true,
                })
                  .then(photo => {
                    photo.exif = this._sanitizeObjectValues(photo.exif);
                    resolve(photo);
                  })
                  .catch(() => reject());
              },
            },
```

Note per l'implementatore:
- `source: CameraSource.Photos` forza il picker a restituire una singola foto dalla galleria (mai la fotocamera, mai un prompt) — è il motivo per cui il bug scompare: `Camera.getPhoto()` restituisce sempre e solo un `Photo`, mai un array, quindi non esiste alcun "primo elemento" da scegliere per sbaglio.
- `webUseInput: this._deviceSvc.isBrowser ? undefined : true` replica lo stesso comportamento già usato da `shotPhoto()` (riga 329, che però usa `null` invece di `undefined`) — allinea il comportamento su Web/PWA tra i due branch dello stesso action sheet invece di lasciarlo al default del plugin. **Usare `undefined`, non `null`**: `ImageOptions.webUseInput` è tipizzato `boolean | undefined` — `shotPhoto()` compila comunque con `null` solo perché la build Angular CLI di questo progetto non ha `strictNullChecks` sufficientemente stretto da segnalarlo, ma l'editor (tsconfig del submodule) lo segnala correttamente come errore di tipo. `undefined`/`null`/proprietà omessa sono equivalenti a runtime (il plugin controlla solo `=== true`).
- `photo.exif = this._sanitizeObjectValues(photo.exif);` replica la sanitizzazione che `getPhotos()` applica internamente (riga ~239: `photo.exif = this._sanitizeObjectValues(photo.exif); return photo;`) — `Camera.getPhoto()` non la fa da solo, va fatta esplicitamente qui.
- Il controllo `if (photos.length === 0) { reject(); return; }` non serve più: `Camera.getPhoto()` restituisce una `Promise<Photo>` singola, non un array, e se l'utente annulla la selezione il plugin rigetta la Promise nativa — già gestito dal `.catch(() => reject())` esistente (stesso pattern usato da `shotPhoto()`, che non ha mai avuto bisogno di un controllo di lunghezza).

- [ ] **Step 3: Aggiornare il JSDoc di `getPhotos()`, reso stale**

Il commento attuale sopra `getPhotos()` (righe 221-227) è:

```typescript
  /**
   * @param options optional overrides merged into the default gallery options
   * (e.g. `{quality: 80, width: 1600}` for the avatar flow). Left unset, this
   * keeps the original full-resolution behavior relied upon by the UGC photo
   * flows (`addPhotos()`) — those must never be resized as a side effect of
   * an option only the avatar flow actually needs.
   */
```

Fa riferimento a un "avatar flow" che, dopo questo task, non chiama più `getPhotos()`. Sostituirlo con:

```typescript
  /**
   * @param options optional overrides merged into the default gallery options.
   * Used by the UGC multi-photo flows (`addPhotos()` in this service,
   * `WmImagePickerComponent.addPhotosFromLibrary()`) — the avatar/profile flow
   * no longer calls this method, see `addProfilePhoto()` (uses
   * `Camera.getPhoto()` directly for a guaranteed single result).
   */
```

- [ ] **Step 4: Verificare che non ci siano errori di tipo/compilazione**

Run: `cd core && npx tsc --noEmit -p src/app/shared/wm-core/tsconfig.json` (oppure, se quel tsconfig standalone non esiste/fallisce per motivi di path dei submodule, in alternativa: `cd core && npm run build -- --configuration=development` per compilare l'intera app, che include wm-core via path alias `@wm-core/*`)

Expected: nessun errore TypeScript relativo a `camera.service.ts` (nessun nuovo import mancante: `Camera`, `CameraResultType`, `CameraSource` sono già importati in cima al file, riga 6-14).

- [ ] **Step 5: Verifica manuale — Web**

Run: `cd core && npm start` (avvia `ng serve` su `http://localhost:4200`)

1. Accedi con un utente autenticato, apri la pagina di modifica profilo (`ProfileEditComponent`).
2. Tocca il pulsante per cambiare la foto profilo → scegli "Dalla libreria".
3. Verifica che si apra il selettore file standard del browser in modalità **singola** (nessun modo di selezionare più file contemporaneamente).
4. Seleziona un'immagine e verifica che l'anteprima mostrata in `ProfileEditComponent` corrisponda esattamente al file scelto.

Expected: la foto mostrata è sempre quella effettivamente selezionata, mai un'altra.

- [ ] **Step 6: Verifica manuale — Android (build reale)**

Segui la procedura di build Android già in uso nel progetto (`gulpfile.js`, vedi CLAUDE.md del repo principale per i comandi `build-android-apk-debug` o equivalente) per generare un APK/bundle con questa modifica.

1. Installa la build su un device o emulatore Android.
2. Apri la modifica profilo → "Dalla libreria".
3. Prova esplicitamente a toccare più immagini in rapida successione nella galleria di sistema (per riprodurre lo scenario segnalato dal cliente: selezione multipla accidentale).
4. Verifica che il picker non permetta la multi-selezione (si chiude/conferma alla prima immagine toccata) e che la foto risultante nell'app sia quella toccata.

Expected: nessuna possibilità di selezione multipla; foto risultante sempre corretta.

- [ ] **Step 7: Verifica manuale — iOS (build reale)**

Stessa procedura dello Step 6, sulla build iOS (TestFlight o device via Xcode).

Expected: stesso comportamento — selezione singola forzata, foto risultante sempre corretta.

- [ ] **Step 8: Commit**

Da eseguire **solo dopo conferma esplicita del developer** (nessun commit automatico):

```bash
git add core/src/app/shared/wm-core/projects/wm-core/src/services/camera.service.ts
git commit -m "fix(oc:8523): forza selezione singola foto profilo da galleria"
```
