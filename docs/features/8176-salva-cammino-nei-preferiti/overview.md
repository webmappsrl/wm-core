> Ticket: oc:8176

# Salva cammino nei preferiti — wm-core

## Cosa cambia

Aggiunto un cuoricino su `wm-layer-box` (box card nella lista/home) e su `wm-home-layer` (schermata di dettaglio del layer/cammino), visibile **solo se l'utente è loggato** (stesso pattern di `wm-ugc-box`: nascosto del tutto per utenti anonimi, nessun prompt di login) e **solo se `OPTIONS.showFavorites=true`** in config.json.

**Revisione post-verifica visiva (deviazione dal piano originale):** su `wm-layer-box` il cuoricino è **di sola lettura** (solo indicatore di stato preferito/non preferito, nessun tap/toggle) — non interattivo come previsto inizialmente. È stato inoltre rimpicciolito e spostato **sotto** il badge `wm-layer-features-counter-badge` (prima si sovrapponeva, essendo entrambi posizionati in alto a destra). Il toggle interattivo (tap, guardia anti-doppio-tap, toast di errore, evento PostHog) resta **solo su `wm-home-layer`**. Vedi notes.md per il dettaglio della decisione.

Lo stato "è preferito?" e il toggle chiamano il nuovo endpoint `GET /api/layer/favorite/list` / `POST /api/layer/favorite/toggle/{layer}` (wm-package, vedi overview dedicato). La lista completa dei layer preferiti viene cacheata client-side in un nuovo servizio di wm-core (stesso pattern di `GeohubService.favourites()` nel repo principale, ma qui serve in wm-core perché `wm-layer-box`/`wm-home-layer` vivono qui) — nessun flag `is_favorited` embedded nella risposta layer, il check è `cachedLayers.some(l => l.id === layerId)`. Dopo un toggle, la cache si aggiorna **otticamente in locale** dal valore `favorite: bool` ritornato dalla risposta (nessun refetch completo della lista) — stesso principio di `GeohubService.setFavouriteTrack`. La cache viene azzerata esplicitamente al logout (evita che su un dispositivo condiviso restino visibili i preferiti dell'utente precedente).

Il toggle (solo in `home-layer`) è protetto da una guardia anti-doppio-tap (disabilita il cuoricino durante la richiesta in corso, stesso pattern già usato in oc:8183 per lo share social) — un endpoint di toggle non idempotente combinato a tap ripetuti ravvicinati potrebbe altrimenti invertire lo stato più volte in modo imprevedibile per l'utente. Se il toggle fallisce (es. offline), viene mostrato un toast di errore e lo stato del cuoricino non viene modificato ottimisticamente prima della risposta.

Il tap sul cuoricino in `home-layer` chiama esplicitamente `$event.stopPropagation()` prima del toggle (non serve in `layer-box`, dove il cuoricino non ha più alcun listener di click, essendo di sola lettura).

Un evento PostHog `layerFavorited` viene emesso solo al momento dell'aggiunta (non alla rimozione), **solo da `home-layer`** (unico punto dove avviene il toggle), con `layer_id` passato **esplicitamente** nelle props — non affidandosi al context auto-iniettato da `PosthogContextService` (che riflette il layer *aperto/navigato*) — e `shard_name` (da `EnvironmentService.shardName`, registrato come super-property globale PostHog, non passato esplicitamente).

**Bug trovato durante la verifica visiva, corretto**: le classi CSS inizialmente usate (`webmapp-icon-heart`/`webmapp-icon-heart-outline`, copiate da un pattern già presente in `map-track-card.component.html` nel repo principale) **non esistono** nell'icon font del progetto — verificato in `core/src/assets/icons/webmapp-icons/style.css`. Le classi reali, già usate correttamente altrove (`tabs.page.html`, `map.page.html`) sono `icon-fill-heart` (preferito) e `icon-outline-heart` (non preferito). Il cuoricino non era quindi mai visibile (contenitore renderizzato, nessuna icona). Corretto in entrambi i componenti.

**UX (da `ui-ux-pro-max`, rivista dopo verifica visiva):** su `home-layer` il cuoricino interattivo mantiene un'area di tap minima 44×44px; su `layer-box` (sola lettura) è stato ridotto a 28×28px e riposizionato sotto il badge conteggio (prima si sovrapponevano, entrambi in alto a destra) — vedi notes.md. Stato preferito/non preferito distinto per forma icona (`icon-fill-heart`/`icon-outline-heart`), non solo per colore.

## Perché

Vedi `webmapp-app/docs/features/8176-salva-cammino-nei-preferiti/overview.md` per il contesto completo (tab "Favourites" già esistente per le tracce, questa feature lo estende ai layer).

## Requisiti

- [ ] Nuovo selettore `confOPTIONSShowFavorites` in `store/conf/conf.selector.ts`
- [ ] Estensione interfaccia `OPTIONS` (submodule **wm-types**, `src/config.ts` — non wm-core: `ICONF.OPTIONS` in wm-core importa da `@wm-types/config`) con `showFavorites?: boolean`
- [ ] Nuovo servizio (es. `layer-favorite.service.ts`) con cache in-memory della lista preferiti layer: fetch una sola volta da `GET /api/layer/favorite/list`, aggiornamento ottimistico locale dal valore `favorite: bool` ritornato dal toggle (nessun refetch completo), reset esplicito al logout
- [x] Cuoricino **di sola lettura** in `layer-box.component.html`/`.ts`: `*ngIf="(isLogged$|async) && (confOPTIONSShowFavorites$|async)"`, nessun click handler, 28×28px, posizionato sotto il badge conteggio (non sovrapposto)
- [ ] Cuoricino **interattivo** in `home-layer.component.html`/`.ts`: area tap 44×44px, `$event.stopPropagation()` prima del toggle, guardia anti-doppio-tap (disabilita durante la richiesta), toast di errore se il toggle fallisce
- [ ] Evento PostHog `layerFavorited` (solo su add, solo da `home-layer`) con `layer_id` passato esplicitamente (non da auto-context)
- [ ] i18n: nuove chiavi (label aria, eventuali tooltip) nelle 7 lingue (`it, en, de, es, fr, pr, sq`), italiano come lingua sorgente

## Rischi

- **Doppia sorgente di stato preferiti tra wm-core (cuoricino) e webmapp-app (tab Cammini in FavouritesPage)**: entrambi consumano lo stesso endpoint `GET /api/layer/favorite/list`, ma vivono in repo/moduli diversi — se uno dei due non invalida la cache dopo un toggle fatto dall'altro, si rischia uno stato disallineato tra "cuoricino pieno sulla card" e "presenza nella lista preferiti" finché non si ricarica la pagina. Va condiviso lo stesso servizio/cache (import diretto da `@wm-core/...` in webmapp-app, stesso pattern già usato per `isLogged` da `auth.selectors`)
- **Nessuna paginazione su `GET /api/layer/favorite/list`** (rischio accettato in Fase: challenge): a differenza del tab Tracce (`ion-infinite-scroll`, necessario perché le tracce GPS si accumulano rapidamente), il numero di cammini che un utente può preferire è realisticamente basso. Da riconsiderare solo se in produzione emergono utenti con centinaia di layer preferiti
- **Nessuna gestione offline oltre al toast di errore**: un tap sul cuoricino senza connettività fallisce con un errore visibile, nessuna coda/retry — coerente con l'assenza di gestione offline nel resto di `FavouritesPage` oggi

## Out of scope

- Redesign generale di `wm-layer-box`/`wm-home-layer` oltre al cuoricino
- Preferiti su `EcPoi`

## Moduli toccati

- `projects/wm-core/src/box/layer-box/layer-box.component.{ts,html,scss}`
- `projects/wm-core/src/home/home-layer/home-layer.component.{ts,html,scss}`
- `projects/wm-core/src/store/conf/conf.selector.ts`
- `projects/wm-core/src/services/` (nuovo `layer-favorite.service.ts`)
- **submodule wm-types**: `src/config.ts` (estensione `OPTIONS`)
- `projects/wm-core/src/localization/i18n/{it,en,de,es,fr,pr,sq}.ts`
