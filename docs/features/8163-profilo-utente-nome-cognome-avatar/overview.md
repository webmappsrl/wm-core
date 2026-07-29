> Ticket: oc:8163

# Profilo utente: nome, cognome e avatar (wm-core)

## Cosa cambia

L'utente può visualizzare e modificare il proprio profilo (nome, cognome, avatar) tramite un **nuovo componente modale dedicato** (`profile-edit`), separato dall'header read-only esistente `wm-profile-user` (riusato in più punti dell'app, incluso un popup, e che resta invariato salvo il collegamento al modale). L'avatar mostrato è quello restituito dal backend (`avatar_url`, pre-popolato da Gravatar o caricato dall'utente); se assente, viene mostrato un fallback grafico con la sola iniziale del nome (il cognome è opzionale, quindi non è garantito). L'upload della foto riusa l'action sheet già esistente in `CameraService.addPhotos()` (Scatta una foto / Dalla libreria / Annulla).

## Perché

Il cliente vuole che gli utenti abbiano un'identità riconoscibile nell'app, come base per le feature social future (esperienze, passaporto, badge).

## Requisiti

- [ ] `IUser` (auth.model.ts): aggiunta `surname?: string` e `avatar_url?: string`
- [ ] Store auth: nuova action/effect NgRx dedicata (l'unica esistente, `updateUserPrivacy$`/`updatePrivacyAgree()`, è a scopo singolo per `privacy` e invia JSON) che costruisca una richiesta `FormData`/multipart verso l'endpoint già esistente `POST /api/auth/user` (`AppAuthController::update`, verificato in `wm-package/routes/api.php:31`) — il contratto di partial update (`sometimes`) è già collaudato in produzione per `privacy`, ma la costruzione multipart per nome/cognome/foto va scritta da zero, non è un semplice riuso
- [ ] Nuovo componente modale `ProfileEditComponent` (`projects/wm-core/src/profile/profile-edit/`) con form nome, cognome, upload avatar
  - [ ] [UX] Touch target minimo 44×44px, spaziatura ≥8px tra elementi interattivi
  - [ ] [UX] Upload avatar tramite un nuovo metodo dedicato in `CameraService` (es. `addProfilePhoto(): Promise<Photo>`) che riusa lo stesso action sheet di `addPhotos()` (Scatta una foto / Dalla libreria / Annulla) ma restituisce una singola foto — `addPhotos()` esistente (firma `Promise<Photo[]>`) resta invariato per non impattare i flussi UGC che lo consumano già
  - [ ] Limite dimensione/compressione lato client sulla foto selezionata prima dell'upload (oggi `CameraService.getPhotos()` non ha `limit`/resize impostato) — evita timeout upload su connessioni mobili scadenti con foto di grandi dimensioni dalla libreria
  - [ ] [UX] Stato esplicito loading → success/error sia sul submit del form sia sull'upload della foto (nessun invio silenzioso)
  - [ ] [UX] Label sempre visibili sui campi (mai solo placeholder); errori mostrati dopo il touch del campo (pattern Angular reactive forms già in uso nel resto dell'app)
  - [ ] [UX] Dismiss del modale gestito esplicitamente sul back-button Android (comportamento standard Ionic modal, non delegato al default)
- [ ] Fallback iniziali: mostra solo l'iniziale del nome (mai un placeholder generico) quando `avatar_url` è assente; stesso sizing di `ion-avatar` esistente per evitare layout shift quando l'immagine reale carica in un secondo momento
  - [ ] [UX] Iniziali su sfondo colorato coerente con la palette esistente dell'app
- [ ] `profile-user.component`: aggiornamento per mostrare avatar reale o fallback iniziali (oggi mostra sempre l'icona generica `wm-icon-user-outline`) e per aprire il nuovo modale di edit
- [ ] Traduzioni: tutte le nuove chiavi UI in tutte le lingue esistenti (`it, en, de, es, fr, pr, sq`), testo base in italiano (pattern consolidato nel repo)

## Rischi

- **[UX] Nome/cognome molto lunghi** possono rompere il layout dell'header o il calcolo delle iniziali — va previsto un troncamento esplicito (CSS `text-overflow` o limite caratteri lato form).
- **[UX] Upload fallito o assenza di connessione** — l'utente deve restare con il fallback iniziali senza stati inconsistenti (es. spinner bloccato a tempo indeterminato); serve un timeout/retry esplicito sull'upload.
- **`avatar_url`/`surname` dipendono dal backend** — se lo shard non ha ancora pubblicato la migration/deploy di wm-package, questi campi restano sempre `undefined`: il fallback a iniziali gestisce già questo caso senza errori, ma va verificato in test manuale prima del rollout.
- **Test Cypress esistente `login-offline.cy.ts` referenzia `wm-profile-user`** — un cambio di markup nel componente (aggiunta avatar/iniziali) può rompere selettori DOM impliciti nel test; da verificare in Fase: execution/test, non blocca la pianificazione.
- **Duplicazione visiva nome+cognome per utenti esistenti** — confermato via query diretta sul DB di produzione `camminiditalia` che molti utenti esistenti hanno già `name` con nome e cognome concatenati (es. "Gianlorenzo Spaggiari", "massimo gardini"). Se un utente esistente compila ora il nuovo campo `surname` senza modificare `name`, l'header o altri punti dell'app che concatenano `name` + `surname` per la visualizzazione rischiano di mostrare un cognome duplicato (es. "Massimo Gardini Gardini"). Mitigazione: **non concatenare mai `name` e `surname` per la visualizzazione** — mostrare `name` così com'è (può già contenere il cognome) e `surname` solo come campo separato nel form di edit, mai fuso in un'unica stringa visualizzata. Nessuna migrazione/parsing automatico del `name` esistente è previsto in questo ciclo.

## Out of scope

- Editing avatar per altri utenti o contesto admin
- Crop/editing dell'immagine caricata (upload diretto, nessun editor immagine)

## Moduli toccati

- `projects/wm-core/src/store/auth/auth.model.ts`
- `projects/wm-core/src/store/auth/` (selectors, effects, actions se necessario)
- `projects/wm-core/src/profile/profile-edit/` (nuovo componente)
- `projects/wm-core/src/profile/profile-user/profile-user.component.*`
- `projects/wm-core/src/localization/i18n/*.ts` (nuove chiavi)
