> Ticket: oc:8523

# Bug: la foto profilo caricata dalla galleria non è quella selezionata

## Cosa cambia

In `CameraService.addProfilePhoto()` (`camera.service.ts`), il ramo "Dalla libreria" smette di usare `getPhotos()` (che internamente chiama `Camera.pickImages()`, un picker multi-selezione) e usa invece `Camera.getPhoto({source: CameraSource.Photos, ...})` — lo stesso metodo già usato da `shotPhoto()` per la fotocamera, che restituisce sempre e solo una singola `Photo` per costruzione, su tutte le piattaforme (Android, iOS, Web/PWA).

Nessun'altra chiamata a `getPhotos()`/`pickImages()` viene toccata: `addPhotos()` (flussi UGC, multi-selezione voluta) resta invariato.

## Perché

Il cliente (camminiditalia) ha segnalato che selezionando una foto dalla galleria per l'avatar del profilo, a volte compare un'immagine diversa da quella scelta.

Causa identificata nel codice: `addProfilePhoto()` apriva la galleria in modalità multi-selezione (`Camera.pickImages()`, nessun `limit` impostato) e prendeva sempre `photos[0]` (la prima foto selezionata), ignorando le altre — se l'utente seleziona più immagini anche per errore (tocco accidentale sulla UI multi-select), l'app mostra la prima e non l'ultima toccata, percepita dall'utente come "sbagliata".

L'opzione `limit: 1` di `pickImages()` (ipotesi iniziale nel ticket) è stata scartata dopo verifica nel codice del plugin: è documentata come supportata solo su **Android 13+ e iOS**, mentre questo progetto forza `minSdkVersion = 28` (Android 9) in `gulpfile.js:1065` — Android 9-12 resterebbe scoperto. Sul **Web/PWA**, l'implementazione `pickImages()` del plugin (`web.js`) ignora `limit` e usa sempre un `<input type="file" multiple>` — quindi la webapp resterebbe scoperta *sempre*. `Camera.getPhoto({source: CameraSource.Photos})` non ha questo limite: su web usa un `<input type="file">` senza `multiple`, su nativo restituisce sempre un singolo risultato per contratto del plugin.

## Requisiti

- [x] `addProfilePhoto()` (ramo "Dalla libreria") usa `Camera.getPhoto({source: CameraSource.Photos, quality: 80, width: 1600, resultType: CameraResultType.Uri, webUseInput: this._deviceSvc.isBrowser ? null : true})` invece di `getPhotos()` — `webUseInput` allineato allo stesso valore già usato da `shotPhoto()`, per non lasciare il comportamento Web/PWA al default non testato del plugin
- [x] Il `Photo` risolto passa da `_sanitizeObjectValues(photo.exif)` prima di essere restituito (stesso trattamento già applicato dal vecchio `getPhotos()`) — `Camera.getPhoto()` non sanitizza l'EXIF di suo, va fatto esplicitamente nel ramo chiamante
- [x] Il `Photo` risolto mantiene i campi già consumati a valle (`path`, `webPath`) senza modifiche al chiamante (`profile-edit.component.ts`, `auth.service.ts`)
- [x] `addPhotos()` (flusso UGC, multi-selezione) non viene toccato
- [ ] Comportamento verificato manualmente su Android, iOS e Web (build reali, non solo unit test — il picker nativo non è testabile in automatico)

## Rischi

- **UX del picker nativo diversa**: `Camera.getPhoto({source: Photos})` apre l'interfaccia di selezione singola nativa, visivamente diversa dal picker multi-selezione attuale — cambio di UI atteso e voluto (elimina la possibilità stessa di selezionare più foto), non un rischio da mitigare.
- **Nessuna copertura automatica**: non esistono unit test su `CameraService` (nessun `camera.service.spec.ts`) e il picker nativo non è testabile via Cypress — la verifica dipende interamente dal test manuale su dispositivo/build reale, confermato disponibile dal developer su tutte le piattaforme.
- **Comportamento `saveToGallery`**: non esplicitato nella nuova chiamata (default `false` per `ImageOptions`, "se la foto è stata scelta dalla galleria viene salvata di nuovo solo se modificata") — stesso comportamento di fatto di `getPhotos()`/`pickImages()`, che non salvava mai la foto scelta di nuovo in galleria. Nessuna regressione attesa.

## Out of scope

- `addPhotos()` e il flusso UGC multi-foto (segnalazioni/tracce) — la multi-selezione lì è intenzionale e resta invariata.
- Eventuali fix equivalenti su altri punti dell'app che usassero `pickImages()` con la stessa ambiguità — nessun altro consumer trovato in questo ciclo.
- Aggiunta di test automatici per `CameraService` — non richiesto dal ticket, il plugin nativo non si presta a mock affidabili senza un investimento sproporzionato rispetto allo scope del bug.

## Moduli toccati

- `core/src/app/shared/wm-core/projects/wm-core/src/services/camera.service.ts` (submodule **wm-core**) — unico file modificato
