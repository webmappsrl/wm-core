# Profilo utente: editing e avatar

## Come funziona oggi

L'editing di nome, cognome e avatar sta in un componente modale dedicato, `ProfileEditComponent` (`profile/profile-edit/`), separato dall'header read-only `wm-profile-user`, che è riusato in più punti dell'app e si limita ad aprire il modale.

Il salvataggio passa da un'action NgRx dedicata che costruisce una richiesta `FormData`/multipart verso l'endpoint già esistente `POST /api/auth/user`. L'avatar mostrato è `avatar_url` restituito dal backend (pre-popolato da Gravatar o caricato dall'utente); se manca, si mostra la sola iniziale del nome, mai un placeholder generico.

La foto si sceglie con `CameraService.addProfilePhoto()`, che riusa l'action sheet di `addPhotos()` ma restituisce una singola foto e passa esplicitamente `{quality: 80, width: 1600}`. `getPhotos()` accetta un secondo parametro `options?: Partial<GalleryImageOptions>` e mantiene `quality: 100` come default.

## Perché così

- **La compressione è un parametro, non un default** (oc:8163): applicarla al default condiviso di `getPhotos()` avrebbe compresso anche le foto UGC di documentazione di sentieri e POI, che non hanno motivo di perdere qualità. Il limite serve solo all'avatar, per evitare timeout di upload su connessioni mobili scadenti.
- **`name` e `surname` non vanno mai concatenati per la visualizzazione** (oc:8163): molti utenti già esistenti hanno nome e cognome concatenati dentro `name` (verificato sul DB di produzione `camminiditalia`). Chi compilasse ora `surname` si vedrebbe il cognome due volte. Si mostra `name` così com'è, e `surname` resta un campo a sé nel form. Nessuna migrazione o parsing automatico del `name` esistente è previsto.
- **`ProfileEditComponent` gestisce da sé l'esito** (oc:8163): `save()` si iscrive a `Actions` (`ofType(loadAuthsSuccess, updateUserProfileFailure)`) e decide da solo dismiss e alert, invece di delegarli al chiamante. Il componente non dipende da chi lo apre per il proprio ciclo di vita.
- **Il fallback a iniziali copre anche il backend non ancora aggiornato** (oc:8163): su uno shard senza la migration di `wm-package`, `avatar_url` e `surname` restano `undefined` e l'UI regge senza errori.
- **`ModalHeaderComponent` sta in `WmSharedModule`** (oc:8163), non in `WmCoreModule`: `profile.module.ts` importa il primo e non il secondo, e `<wm-modal-header>` serve al modale di profilo.

## Debito noto

- **Il successo riusa `loadAuthsSuccess`, senza ID di correlazione** (oc:8163): se un altro `loadAuthsSuccess` non correlato arrivasse mentre il modale è in `SAVING` (per esempio un refresh silenzioso di sessione), il modale potrebbe chiudersi scambiandolo per il proprio esito. Verificato che il riuso **non** corrompe l'autenticazione: `setAccessToken` non rimuove mai il token se assente dalla risposta, e `AuthInterceptor` lo legge da `localStorage`, non dallo stato NgRx. Una `updateUserProfileSuccess` dedicata risolverebbe sia la correlazione sia il sync UGC completo che parte ad ogni modifica del profilo.
- **`FetchGravatarAvatarJob` non cattura le eccezioni di `addMedia()->toMediaCollection()`** (oc:8163): il docblock promette un logging distinto di ogni fallimento, ma copre solo la chiamata HTTP. Un 200 con body corrotto sfugge senza log — rilevante soprattutto in un backfill su molti utenti.
- **Duplicazioni candidate a un'estrazione** (oc:8163): il pattern "avatar o iniziali" è ripetuto fra `profile-user` e `profile-edit`, il colore `#4285f4` è hardcoded in più punti, e `addProfilePhoto()`/`addPhotos()` condividono lo stesso action sheet.
