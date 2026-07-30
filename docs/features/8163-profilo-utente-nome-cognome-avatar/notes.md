> Ticket: oc:8163

# Notes — Profilo utente: nome, cognome e avatar (wm-core)

## Deviazioni dal piano

### `ModalHeaderComponent` spostato da `wm-core.module.ts` a `shared.module.ts`
Non previsto da nessun task del piano. Necessario perché `ProfileEditComponent` (Task 5, dichiarato in
`profile.module.ts`) usa `<wm-modal-header>` nel proprio template, ma `profile.module.ts` importa
`WmSharedModule`, non `WmCoreModule` (dove `ModalHeaderComponent` era dichiarato direttamente). Spostato
in `WmSharedModule` (già importato sia da `profile.module.ts` sia da `wm-core.module.ts`), verificando che
`LoginComponent`/`RegisterComponent` (altri consumer) continuino a funzionare — nessuna doppia
dichiarazione, nessuna regressione (suite completa 223/223 verde).

### Gestione SUCCESS/ERROR incapsulata in `ProfileEditComponent`, non in `profile-user.component` come da piano
Il piano (Task 5, nota dopo lo Step 3) prevedeva che l'osservazione dell'esito di `updateUserProfile`
(chiusura modale al successo, alert all'errore) avvenisse in `profile-user.component` (Task 6).
Nell'implementazione reale, `ProfileEditComponent.save()` si iscrive direttamente allo stream `Actions`
(`ofType(loadAuthsSuccess, updateUserProfileFailure)`) e gestisce da sé dismiss/alert — `profile-user.component`
si limita ad aprire il modale. Scelta più incapsulata (il componente non dipende dal chiamante per il
proprio ciclo di vita), non documentata esplicitamente durante l'esecuzione.

### `CameraService.getPhotos()` — limite qualità/dimensione applicato di default al posto di essere parametrizzato
Il piano (Task 4) modificava direttamente il default condiviso di `getPhotos()` (usato anche dai flussi
UGC esistenti: segnalazioni POI/traccia) invece di seguire l'alternativa che lo stesso piano suggeriva
("estrarre un `getPhotos(options?: Partial<GalleryImageOptions>)` parametrizzato"). **Corretto durante la
review formale** (3 finder indipendenti su 5 hanno segnalato lo stesso problema): `getPhotos()` ora accetta
un secondo parametro opzionale `options?: Partial<GalleryImageOptions>`; il default torna a
`quality: 100` (nessun limite, comportamento pre-ticket per i flussi UGC), e solo `addProfilePhoto()`
passa esplicitamente `{quality: 80, width: 1600}`. Nessuna foto UGC (documentazione sentieri/POI) viene più
compressa come effetto collaterale dell'avatar. Verificato: suite completa 223/223 verde dopo il fix.

## Rischio noto, non risolto in questo ciclo

### Riuso di `loadAuthsSuccess` per il successo di `updateUserProfile` — nessun ID di correlazione
`updateUserProfile$` (auth.effects.ts) dispatcha `loadAuthsSuccess({user})` come azione di successo,
stesso pattern già usato da `updatePrivacyAgree$` — ma senza alcun ID di correlazione tra il dispatch di
`ProfileEditComponent.save()` e l'azione che chiude il modale. Rischio teorico: se un'altra azione
`loadAuthsSuccess`/`updateUserProfileFailure` non correlata si verificasse mentre il modale è in stato
`SAVING` (es. refresh silenzioso di sessione), il modale potrebbe chiudersi interpretando quell'esito come
il proprio.

**Verificato esplicitamente** (durante la review formale) che questo riuso NON corrompe il token di
autenticazione reale: `setAccessToken(user)` (`auth.reducer.ts`) scrive `localStorage.access_token` solo
se `user.access_token` è presente (mai lo rimuove se assente), e `AuthInterceptor` legge il token da
`localStorage` direttamente, non dallo stato NgRx `user.access_token` — quindi anche se la risposta di
`update()` (che non include `access_token`, a differenza di login/signup) sovrascrive
`state.user.access_token` a `undefined`, l'autenticazione reale delle richieste successive non ne risente.

Non corretto in questo ciclo: introdurre una `updateUserProfileSuccess` dedicata (invece di riusare
`loadAuthsSuccess`) risolverebbe sia la correlazione sia l'effetto collaterale di `syncUgcAfterAuthSuccess$`
(un sync UGC completo ad ogni modifica profilo, già segnalato come accettato nel piano) — ma è un cambio
più ampio dello store auth, da valutare in un ciclo successivo con il developer, non applicato
unilateralmente durante questa review.

### `FetchGravatarAvatarJob` non cattura eccezioni da `addMedia()->toMediaCollection()`
Il docblock del job promette "nessun retry, fallimento sempre loggato distintamente" — ma questo copre solo
la chiamata HTTP (timeout/connessione) e lo status code. Se Gravatar risponde 200 con un body non
processabile da Spatie Media Library/GD (corrotto, troncato), l'eccezione non viene catturata e sfugge da
`handle()` senza il logging distinto promesso. Rilevante soprattutto in scala (backfill su migliaia di
utenti). Non corretto in questo ciclo — richiede una decisione su come loggare/gestire questo caso
specifico, segnalato per un ciclo successivo.

## Follow-up per cicli successivi (da findings di cleanup, non bloccanti)
- Colore `#4285f4` hardcoded ripetuto in più punti (profile-user, profile-edit) — da centralizzare in una
  variabile SCSS condivisa.
- `addProfilePhoto()`/`addPhotos()` in `CameraService` duplicano lo stesso action sheet con solo il tipo di
  ritorno diverso — candidato per un helper condiviso parametrizzato.
- Pattern "avatar o iniziali" duplicato tra `profile-user.component` e `profile-edit.component` — candidato
  per un componente condiviso `wm-user-avatar`.
- Nessuna guardia sincrona esplicita contro il doppio tap su "Salva" in `ProfileEditComponent.save()` (solo
  `[disabled]` sul bottone) — pattern "guardia a due livelli" usato altrove nel repo (es. condivisione
  social) non replicato qui; rischio basso, mitigato comunque da `switchMap` nell'effect.
