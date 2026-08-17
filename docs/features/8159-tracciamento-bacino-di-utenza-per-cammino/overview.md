> Ticket: oc:8159

# Tracciamento bacino di utenza per cammino — user_id in WmPosthogProps

## Cosa cambia

`PosthogContextService` viene esteso per popolare automaticamente il nuovo campo `user_id` (wm-types, oc:8159) su ogni evento capturato via `capture()`, leggendo l'id dell'utente autenticato dallo store NgRx (`auth.selectors.ts` → `user`). Se l'utente non è loggato, il campo non viene incluso (comportamento invariato per utenti anonimi — nessuna regressione).

## Perché

Emerso da una call col cliente, come specifica aggiuntiva al ticket oc:8159: si vuole identificare l'utente specifico che compie un'azione tracciata da PostHog, in generale su tutti gli eventi (non solo `userMoved`). Nel contesto immediato del ticket più ampio, abilita — lato Nova/wm-package, in un ciclo successivo — il riconoscimento di quale utente loggato sta percorrendo un cammino nella vista live delle posizioni GPS (requisito 2 di oc:8159). Il dato deve essere già disponibile lato app perché quel lavoro backend possa poi consumarlo.

## Requisiti

- [ ] `PosthogContextService`: aggiungere il selettore `user` (`auth.selectors.ts`) al `combineLatest` che costruisce `_contextSnapshot` (attualmente righe 31-37 di `posthog-context.service.ts`), includendo `user_id` nello snapshot solo quando `user?.id != null`
- [ ] Il campo deve aggiornarsi reattivamente al login/logout (nessuna cache stantia) — garantito naturalmente dal pattern esistente basato su subscribe/snapshot, nessuna logica aggiuntiva richiesta
- [ ] Aggiungere un commento `TODO(oc:8159)` nel punto pertinente che segnali la possibilità futura di usare `identify(user.id)` per il merge storico cross-device/reinstall — decisione esplicita in reverse-interaction: non implementarlo ora, solo lasciarne traccia

## Rischi

Esito della Fase: challenge (revisore adversariale + discussione col developer), un punto per ogni decisione presa:

- **Scope confermato ampio, non solo GPS** — verificato via grep sui call site di `POSTHOG_CLIENT`: `capture()` è invocato per ogni evento (`filterUsed`, `layerOpened`, `searchPerformed`, `deepLinkOpened`, `navigationStarted/Stopped`, `$pageview`, `userMoved`, ecc.). Popolare `user_id` in `_buildContext()` significa che **l'intera cronologia comportamentale** dell'utente loggato viene identificata su PostHog, non solo gli eventi di tracciamento cammino. **Decisione confermata dal developer**: scope ampio voluto, nessuna restrizione ai soli eventi GPS.
- **Privacy/de-anonimizzazione della vista live-position** — il ticket originale oc:8159 specifica esplicitamente "i marker sono anonimi (nessun nome/cognome esposto)" per la visualizzazione live sulla mappa in Nova. Aggiungere `user_id` rende ora possibile, lato backend, risalire dall'evento GPS all'identità reale dell'utente (via join sul DB Laravel) per gli utenti loggati. **Decisione confermata**: nessuna mitigazione in questo ciclo, da ridiscutere quando/se wm-package consumerà il campo per la vista live-position.
- **Nessun gate di consenso privacy né kill-switch runtime** — coerente col comportamento preesistente di tutto PostHog nell'app (nessun evento è oggi gated su `hasPrivacyAgree`/`privacy_agree`). Dato lo scope ampio confermato, il worst-case è: dati comportamentali completi + posizione GPS precisa, taggati con id joinable a un'identità reale, su un SaaS terzo dal primo giorno, disattivabili solo con un nuovo deploy (nessun flag `OPTIONS` runtime). **Decisione confermata dal developer** in Fase: challenge: rischio accettato così com'è, nessun flag introdotto.
- **Timing login/logout** — lo store `auth` si ripopola in modo asincrono all'avvio (`loadAuths$`, rehydrate da storage locale); un evento catturato prima del rehydrate parte senza `user_id` anche se l'utente è di fatto loggato (falso negativo silenzioso). Una traccia GPS che attraversa un login a metà sessione produce eventi parzialmente con e parzialmente senza `user_id`. **Decisione confermata**: nessun trattamento speciale, il campo riflette semplicemente lo stato di login istante per istante (comportamento naturale del pattern reattivo esistente).
- **Device condiviso / multi-account** — senza `identify()`/`reset()` al login/logout (fuori scope, TODO), il `distinct_id` di PostHog resta lo stesso al cambio di utente loggato sullo stesso device; `user_id` sarà comunque corretto per-evento, ma la sessione PostHog sottostante resta mescolata. **Decisione confermata**: limitazione nota accettata, collegata al TODO `identify()`.
- **Rollback dati non retroattivo** — un rollback del codice è banale (campo opzionale), ma gli eventi già inviati a PostHog restano lì (SaaS terzo, nessuna procedura di cancellazione/diritto all'oblio prevista in questo ciclo). Rischio accettato.
- **Dato non consumato in questo ciclo** — nessuna query backend usa ancora `user_id` (confermato out of scope). Se il lavoro futuro lato wm-package non arriva a leggerlo, resta dead data. Rischio basso (costo di manutenzione, non di rottura).
- **Nessuna garanzia tipizzata che solo `PosthogContextService` scriva `user_id`** — essendo un campo pubblico opzionale di `WmPosthogProps`, un futuro call site potrebbe passarlo esplicitamente a `capture(event, props)`, sovrascrivendo silenziosamente il valore di contesto (le props esplicite vincono sempre nel merge `{...context, ...props}`). Nessun caller attuale lo fa (verificato). Rischio teorico, accettato senza mitigazione dedicata in questo ciclo.

## Out of scope

- Chiamata a `identify()` (lasciata come TODO)
- Gate di consenso privacy dedicato per questo campo
- Flag di gating `OPTIONS` per-shard (il campo è sempre attivo su tutte le istanze)
- Modifiche ad `AnalyticsService`/query HogQL lato `wm-package`

## Moduli toccati

- `projects/wm-core/src/services/posthog-context.service.ts`
