> Ticket: oc:8671

# Esito della richiesta di certificazione nel passaporto — piano di implementazione

> **Per chi esegue:** sub-skill richiesta `superpowers:executing-plans` o
> `superpowers:subagent-driven-development`. I passi usano le checkbox (`- [ ]`).
> **Nessun commit e nessun branch automatico:** i passi «Commit» sono istruzioni per il dev, che
> li esegue solo dopo la review.

**Obiettivo:** il dettaglio del passaporto mostra approvata e non accettata con data e nota del
gestore, permette un nuovo invio, manda la lingua dell'app con la richiesta e si rilegge al ritorno
in primo piano senza bloccarsi sugli errori.

**Architettura:** i tipi si allargano in `wm-types`. `PassportService` converte i quattro stati,
mette `Accept-Language` sul solo POST ed espone il `resume` di `@capacitor/app` come Observable. Il
dettaglio calcola dal vm cosa mostrare e gestisce gli errori sulla singola rilettura. La nota del
gestore è un componente a sé, che misura il troncamento sul testo reale.

**Stack:** Angular 20, Ionic 8, RxJS, `@capacitor/app` 7.1.1, Karma + Jasmine (test di classe
senza `TestBed`, come gli spec esistenti del passaporto).

**Spec:** `docs/features/8671-passaporto-camminatore-accettazione-certificazione-e-tappe-validate/overview.md`
(in wm-core), con la versione breve nello stesso percorso di wm-types. Riferimento grafico: viste
V1, V3, E1–E5 della bozza del wireframe <https://claude.ai/artifact/JLM3UhqH6HhE8iHMddevep>.

Percorsi relativi a `core/src/app/shared/`; `W` = `wm-core/projects/wm-core/src`.

## Vincoli globali

- Contratto del GET: `{"status":"none"}` oppure `{"status":"pending|approved|rejected","submitted_at","decided_at","decision_note"}`; `decision_note` può essere `null`.
- Stati del frontend: `'none' | 'pending' | 'approved' | 'rejected'`; uno stato sconosciuto diventa `none`.
- `Accept-Language` solo su `POST /api/layer/{layer}/certification`, valore `LangService.currentLang`, assente se la lingua non è impostata. Nessun interceptor.
- Rilettura al ritorno in primo piano con `App.addListener('resume')` di `@capacitor/app`, mai `DeviceService.onForeground`.
- Il bottone «Invia una nuova richiesta» è lo stesso nei due esiti e apre `host.openForm()`. Dopo un'approvazione compare solo se `progress.percent < 100`; dopo un rifiuto sempre.
- Nota del gestore troncata a 3 righe; aperta, altezza massima `33vh` con scroll interno.
- Ogni stato ha icona e testo; il blocco dell'esito ha `role="status"`; testo ≥ 4.5:1 sugli sfondi.
- Testi nuovi in tutte e 7 le lingue: `it`, `en`, `de`, `fr`, `es`, `pr`, `sq`.
- Naming wm-core: membri privati con `_`, JSDoc su ogni funzione e metodo; documentazione e commenti in italiano.

## Punti da guardare in review

1. **GET che fallisce alla prima apertura:** la zona di stato resta vuota, lo spinner sparisce e l'anello si vede. Test nel Task 3.
2. **Esito approvato con cammino al 100%** (id di resto 2 nel mock): «Approvata» sì, bottone no. Test nel Task 3.
3. **`decision_note` stringa vuota o solo spazi:** si tratta come assente, niente riquadro «Nota del gestore» vuoto. Test nel Task 1.
4. **Chiusura della modale mentre il listener `resume` è in registrazione:** il listener va rimosso anche se `addListener` risolve dopo l'unsubscribe. Test nel Task 2.
5. **`currentLang` vuoto:** niente header `Accept-Language` e nessuna eccezione. Test nel Task 2.

---

### Task 1: tipi e conversione dei quattro stati

**File:**
- Modifica: `wm-types/src/passport.ts:33-42`
- Modifica: `W/passport/passport.service.ts:19-23` (`CertificationResponse`), `:129-141` (`_toCertification` e il suo JSDoc), `:36-46` (JSDoc della classe col contratto nuovo)
- Test: `W/passport/passport.service.spec.ts`

**Interfacce:**
- Produce: `type PassportCertificationStatus = 'none' | 'pending' | 'approved' | 'rejected'`;
  `PassportCertification { layerId; status; submittedAt?: string; decidedAt?: string; decisionNote?: string }`.

- [ ] **Passo 1: scrivi i test che falliscono**, e sostituisci quello di `passport.service.spec.ts:104-107`:
  - `'approvata con nota: stato, date e nota'`: GET `{status:'approved', submitted_at:'2026-09-30T11:14:00+00:00', decided_at:'2026-09-30T11:29:00+00:00', decision_note:'Timbri 2 e 5 leggibili'}` → `{layerId:3, status:'approved', submittedAt:'2026-09-30T11:14:00+00:00', decidedAt:'2026-09-30T11:29:00+00:00', decisionNote:'Timbri 2 e 5 leggibili'}`.
  - `'rifiutata senza nota: decisionNote assente'`: `decision_note: null` → `status:'rejected'` e `decisionNote` `undefined`.
  - `'nota vuota o di soli spazi vale come assente'`: `decision_note: '   '` → `decisionNote` `undefined`.
  - `'uno stato sconosciuto diventa none'`: `{status:'cancelled'}` → `{layerId:3, status:'none'}`.
- [ ] **Passo 2:** `cd wm-core && npm run test:single`. Atteso: i quattro test FALLISCONO.
- [ ] **Passo 3:** allarga i tipi in `wm-types` (JSDoc: `submittedAt` presente per ogni stato diverso da `none`; `decidedAt`/`decisionNote` solo per `approved`/`rejected`). In `CertificationResponse` aggiungi `decided_at?: string | null` e `decision_note?: string | null`. `_toCertification` accetta i tre stati noti e restituisce `{layerId, status:'none'}` per tutto il resto; la nota passa da `trim()` e resta solo se non vuota.
- [ ] **Passo 4:** `npm run test:single`. Atteso: PASS, compresi i test già esistenti del servizio.
- [ ] **Passo 5 — Commit (dev):**
  ```bash
  git -C wm-types add src/passport.ts && git -C wm-types commit -m "feat(oc:8671): stati approvata e rifiutata della certificazione"
  git -C wm-core add projects/wm-core/src/passport/passport.service.ts projects/wm-core/src/passport/passport.service.spec.ts
  git -C wm-core commit -m "feat(oc:8671): conversione degli esiti della richiesta di certificazione"
  ```

### Task 2: lingua nel POST e resume come Observable

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-2-listener-del-resume)

**File:**
- Modifica: `W/passport/passport.service.ts` (costruttore, `submitCertification`, nuovo metodo)
- Test: `W/passport/passport.service.spec.ts`

**Interfacce:**
- Consuma: `LangService` (`@wm-core/localization/lang.service`), `App` da `@capacitor/app`.
- Produce: `PassportService.appResume$(): Observable<void>`. Emette a ogni `resume` e alla
  disiscrizione rimuove il listener.

- [ ] **Passo 1: scrivi i test che falliscono:**
  - `'il POST manda Accept-Language con la lingua scelta nell app'`: `currentLang: 'en'` → le opzioni di `http.post` hanno `headers.get('Accept-Language') === 'en'`.
  - `'senza lingua impostata il POST non manda Accept-Language'`: `currentLang: undefined` → `headers?.has('Accept-Language')` falso, nessuna eccezione.
  - `'il GET non manda Accept-Language'`: `http.get` chiamato senza header `Accept-Language`.
  - `'appResume$ emette a ogni resume e rimuove il listener alla disiscrizione'`: con `spyOn(App, 'addListener')` che restituisce `Promise.resolve({remove})` e salva la callback, due invocazioni della callback → due emissioni; `unsubscribe()` → `remove` chiamato una volta.
  - `'appResume$ rimuove il listener anche se la disiscrizione arriva prima della registrazione'`: `unsubscribe()` sincrono subito dopo `subscribe()`, poi la promise risolve → `remove` chiamato.
  Se `spyOn(App, 'addListener')` fallisce perché `App` è un Proxy di Capacitor, sposta la chiamata in un metodo protetto `_addResumeListener(cb)` e fai lo spy su quello.
- [ ] **Passo 2:** `npm run test:single`. Atteso: FAIL.
- [ ] **Passo 3:** inietta `LangService` nel costruttore (`private _langSvc: LangService`) e aggiorna `create()` nello spec. In `submitCertification` passa `{headers}` solo se `this._langSvc.currentLang` è valorizzato. `appResume$()` è `new Observable<void>(sub => …)`: registra con `App.addListener('resume', () => sub.next())`, tiene la promise dell'handle e nel teardown fa `handle.then(h => h.remove())`. JSDoc spiega perché non `DeviceService.onForeground`: nel browser non scatta ed è un `ReplaySubject(1)`.
- [ ] **Passo 4:** `npm run test:single`. Atteso: PASS.
- [ ] **Passo 5 — Commit (dev):** `feat(oc:8671): lingua della mail di esito e resume nel servizio del passaporto`.

### Task 3: vm del dettaglio, errori e resume

**File:**
- Modifica: `W/passport/passport-detail/passport-detail.component.ts`
- Test: `W/passport/passport-detail/passport-detail.component.spec.ts`

**Interfacce:**
- Consuma: `PassportService.getCertification`, `getProgress`, `appResume$()` (Task 2); stati del Task 1.
- Produce, in `PassportDetailVm`:
  - `certification: PassportCertification | null`: `null` = stato sconosciuto, la prima lettura è fallita;
  - `showCta: boolean`: invariato, `percent < 100 && status === 'none'`;
  - `showRetry: boolean`: `status === 'rejected' || (status === 'approved' && percent < 100)`.
  Il componente implementa `OnInit` e `OnDestroy`.

- [ ] **Passo 1: scrivi i test che falliscono:**
  - `'approvata e cammino non completo: bottone di nuovo invio, niente CTA'`: `partial` + `{status:'approved'}` → `showRetry` vero, `showCta` falso.
  - `'approvata e cammino completo: niente bottone'`: `done` + `approved` → `showRetry` falso.
  - `'non accettata: bottone di nuovo invio anche a cammino completo'`: `done` + `rejected` → `showRetry` vero.
  - `'in revisione: né CTA né bottone'`: `pending` → entrambi falsi.
  - `'prima lettura fallita: vm con certification null, né CTA né bottone'`: `getCertification` = `throwError(() => new Error())` → il vm emette con `certification === null`, `showCta` e `showRetry` falsi.
  - `'rilettura fallita: resta l ultimo stato noto e la successiva riprova'`: prima `approved`, poi errore, poi `rejected` → dopo l'errore `vm.certification.status === 'approved'`, dopo il terzo `refresh()` `'rejected'`, e lo stream non è terminato.
  - `'al resume dell app rilegge lo stato'`: `appResume$` restituisce un `Subject`; dopo `ngOnInit()` e un `next()` → `getCertification` chiamato 2 volte.
  - `'alla chiusura smette di ascoltare il resume'`: `ngOnDestroy()` → `observed` del `Subject` falso.
  Aggiungi `appResume$: () => resume$` al servizio finto di `create()`.
- [ ] **Passo 2:** `npm run test:single`. Atteso: FAIL.
- [ ] **Passo 3:** in `vm$` la lettura della certificazione passa da `catchError(() => of(this._lastCertification))`, dove `_lastCertification: PassportCertification | null = null` si aggiorna con `tap` a ogni lettura riuscita. Il `catchError` sta dentro lo `switchMap`, così lo stream esterno non termina. `ngOnInit` si iscrive a `appResume$()` e chiama `refresh()`; `ngOnDestroy` si disiscrive. Nel JSDoc aggiorna i riferimenti al wireframe (V1/V3/E1–E5) e la descrizione della CTA.
- [ ] **Passo 4:** `npm run test:single`. Atteso: PASS, compresi i test esistenti del dettaglio e della modale.
- [ ] **Passo 5 — Commit (dev):** `feat(oc:8671): esiti, errori e resume nel dettaglio del passaporto`.

### Task 4: componente della nota del gestore

**File:**
- Crea: `W/passport/passport-note/passport-note.component.{ts,html,scss,spec.ts}`
- Modifica: `W/wm-core.module.ts:80-84` e `:159-163` (import e dichiarazione accanto agli altri componenti del passaporto)

**Interfacce:**
- Produce: `WmPassportNoteComponent`, selettore `wm-passport-note`, `@Input() note: string`,
  `standalone: false`, `OnPush`, `ViewEncapsulation.None`. Funzione pura esportata
  `isNoteOverflowing(scrollHeight: number, clientHeight: number): boolean`, vera se
  `scrollHeight - clientHeight > 1`.

- [ ] **Passo 1: scrivi i test che falliscono:**
  - `isNoteOverflowing`: `(60, 60)` falso, `(61, 60)` falso, `(90, 60)` vero.
  - `'toggle apre e chiude la nota'`: `expanded` falso → `toggle()` → vero → `toggle()` → falso.
  - `'senza troncamento «Leggi tutto» non compare'`: `overflowing` falso → `showToggle` falso; con `overflowing` vero oppure `expanded` vero → `showToggle` vero.
- [ ] **Passo 2:** `npm run test:single`. Atteso: FAIL.
- [ ] **Passo 3:** il template è un'etichetta «Nota del gestore» (`passport.note.label`), il testo `«{{ note }}»` in un elemento `#text`, e un `<button type="button">` con `passport.note.more` / `passport.note.less` e `[attr.aria-expanded]`. Chiuso: `-webkit-line-clamp: 3`. Aperto: `max-height: 33vh; overflow-y: auto`. In `ngAfterViewInit` un `ResizeObserver` sull'elemento `#text` aggiorna `overflowing` con `isNoteOverflowing`, solo mentre la nota è chiusa, e chiama `markForCheck()`. `ngOnDestroy` fa `disconnect()`. Se `ResizeObserver` manca, `overflowing` resta falso e la nota resta a 3 righe senza bottone.
- [ ] **Passo 4:** `npm run test:single`. Atteso: PASS.
- [ ] **Passo 5 — Commit (dev):** `feat(oc:8671): nota del gestore troncabile nel passaporto`.

### Task 5: template, stili e traduzioni degli esiti

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-5-colore-del-bottone-di-nuovo-invio)
> ⚠️ Anche le chiavi di traduzione: [notes.md](notes.md#task-5-chiavi-di-traduzione-col-testo-italiano)

**File:**
- Modifica: `W/passport/passport-detail/passport-detail.component.html:46-58`
- Modifica: `W/passport/passport-detail/passport-detail.component.scss` (dopo `.wm-passport-detail-pending-hint`)
- Modifica: `W/passport/_passport-theme.scss` (colori rossi)
- Modifica: `W/localization/i18n/{it,en,de,fr,es,pr,sq}.ts` (dopo `passport.pending.hint`)

**Interfacce:**
- Consuma: `vm.certification` (può essere `null`: il template usa `vm.certification?.status`), `vm.showCta`, `vm.showRetry` (Task 3), `wm-passport-note` (Task 4).

- [ ] **Passo 1:** blocco dell'esito, subito dopo il blocco `pending` e fuori da `.wm-passport-detail-stages`. Un `div.wm-passport-detail-outcome` con modificatore `--approved` o `--rejected` e `role="status"`, che contiene:
  - una riga con il chip (`✓ passport.outcome.approved` / `✕ passport.outcome.rejected`) e `passport.outcome.date` con `{date: shortDate(decidedAt)}`;
  - `<wm-passport-note>` se c'è `decisionNote`;
  - il rimando all'email: `passport.outcome.approvedHint` se approvata, `passport.outcome.rejectedHint` se non accettata e senza nota;
  - se `vm.showRetry`, il bottone verde pieno `📷 passport.retry` con `(click)="host?.openForm()"`, alto almeno 44px.

  Aggiorna il commento in testa al file (wireframe V1/V3/E1–E5, oc:8671).
- [ ] **Passo 2:** stili sul modello di `.wm-passport-detail-pending`: bordo tratteggiato `$passport-green` + `$passport-green-bg` per l'approvata, `$passport-red` + `$passport-red-bg` per la non accettata. Nuovi colori nel tema: `$passport-red: #c0392b`, `$passport-red-bg: #fbeceb`, `$passport-red-chip: #f6d3cf`, `$passport-red-text: #8e2a1f`. La nota ha sfondo `#fff`. Controlla il contrasto testo/sfondo di chip, data e hint (≥ 4.5:1).
- [ ] **Passo 3:** chiavi in `it.ts` con questo testo esatto, poi le stesse chiavi tradotte nelle altre 6 lingue:
  ```ts
  'passport.outcome.approved': 'Approvata',
  'passport.outcome.rejected': 'Non accettata',
  'passport.outcome.date': 'il {{date}}',
  'passport.outcome.approvedHint': "Le tappe riconosciute sono elencate nell'email che ti abbiamo inviato.",
  'passport.outcome.rejectedHint': "Trovi il motivo nell'email che ti abbiamo inviato. Puoi inviare nuove foto della credenziale.",
  'passport.note.label': 'Nota del gestore',
  'passport.note.more': 'Leggi tutto',
  'passport.note.less': 'Mostra meno',
  'passport.retry': 'Invia una nuova richiesta',
  ```
- [ ] **Passo 4:** verifica che nessuna lingua abbia chiavi mancanti:
  ```bash
  cd W/localization/i18n && for f in *.ts; do echo "$f $(grep -c "'passport\.\(outcome\|note\|retry\)" $f)"; done
  ```
  Atteso: `9` su ogni file.
- [ ] **Passo 5:** `npm run test:single` e build dell'app da `core/` con `npx ng build`. Atteso: PASS, e build senza errori di `strictTemplates`.
- [ ] **Passo 6 — Commit (dev):** `feat(oc:8671): esiti della richiesta di certificazione nel dettaglio del passaporto`.

### Task 6: prova manuale contro il backend locale

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-6-prova-manuale)

**File:** nessuno. L'esito va in `notes.md` e la GIF viene segnalata al dev.

- [ ] **Passo 1 — prerequisiti (dev):** backend camminiditalia avviato su `http://127.0.0.1:8000` sul branch di oc:8671, un utente di quel database e Nova raggiungibile. L'app gira con `shardName: 'local'`, la modifica non committata già presente in `core/src/environments/environment.ts`, avviata con `npm start` da `core/`.
- [ ] **Passo 2:** scegli un cammino con id di resto 0 o 1 (`layerId % 3`), così il progresso finto non è al 100%.
- [ ] **Passo 3 (Claude in Chrome, GIF `oc-8671-esiti-certificazione.gif`):** il dev fa il login. Poi:
  1. invio con lingua dell'app `en`;
  2. «In revisione»;
  3. in Nova, approvazione con nota → rientro nella pagina o cambio di scheda → E1;
  4. nuovo invio → «In revisione»;
  5. rifiuto senza nota → E4;
  6. nuovo invio, rifiuto con nota lunga → E5: «Leggi tutto», scroll interno, bottone visibile;
  7. approvazione senza nota → E2.
- [ ] **Passo 4:** chiedi a camminiditalia-fb, o controlla nel DB locale, che la richiesta salvata abbia lingua `en`.
- [ ] **Passo 5 (dev, dispositivo vero):** con il dettaglio aperto e l'app in background, decisione in Nova, app di nuovo in primo piano → lo stato si aggiorna senza uscire dalla pagina.
- [ ] **Passo 6:** registra l'esito di ogni passo in `notes.md`.

### Task 7: puntatori dei submodule nell'app

**File:** `webmapp-app`, puntatori `core/src/app/shared/wm-core` e `core/src/app/shared/wm-types`.

- [ ] **Passo 1 — Commit (dev), dopo quelli dei submodule:** `chore(oc:8671): aggiorna wm-core e wm-types con gli esiti del passaporto`. Senza `core/src/environments/environment.ts`, che resta una modifica locale del dev. Anche in `wm-types` resta fuori `src/environment.ts`, già modificato e non di questo ticket.
