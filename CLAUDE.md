# wm-core — CLAUDE.md

## Test E2E con Cypress — pattern standard

I test Cypress vivono in `wm-webapp/cypress/e2e/`. Per ogni feature di wm-core che tocca la UI:

### Regola generale

**Usare sempre `cy.intercept()` con fixture** — mai dipendere da API reali in test di logica UI.

### Come catturare le fixture

Eseguire una volta con il backend reale, salvare in `cypress/fixtures/`:

```bash
curl -sL "https://<shard>.maphub.it/api/v2/elasticsearch?app=geohub_app_<id>&query=<termine>" \
  -o cypress/fixtures/elastic-<termine>.json

curl -sL "https://wmfe.s3.eu-central-1.amazonaws.com/<shard>/<id>/config.json" \
  -o cypress/fixtures/conf-<id>.json
```

### Template di test

```typescript
const ELASTIC_URL = '**/api/v2/elasticsearch*';
const CONF_URL    = '**/config.json';

const setupIntercepts = (elasticFixture = 'elastic-init') => {
  cy.intercept('GET', CONF_URL,    {fixture: 'conf-1.json'}).as('conf');
  cy.intercept('GET', ELASTIC_URL, {fixture: elasticFixture}).as('elastic');
};

// Setta privacy-accepted prima che Angular si avvii → nessun modal backdrop
const visitWithPrivacy = (url: string) => {
  cy.visit(url, {
    onBeforeLoad(win) {
      win.localStorage.setItem('privacy-accepted', 'true');
    },
  });
};

const waitForApp = () => {
  cy.wait('@conf');
  cy.wait('@elastic');
};
```

### Perché `onBeforeLoad` e non `dismissModal`

La privacy modal appare quando `localStorage.privacy-accepted` è assente.
`clearTestState()` cancella il localStorage → il modal riappare a ogni test.
Settare `privacy-accepted` in `onBeforeLoad` previene l'apertura prima ancora che Angular si avvii, eliminando `{force: true}` e `cy.wait()` arbitrari.

### Vantaggi rispetto ai test con API reali

| | API reali | Fixture + intercept |
|---|---|---|
| Velocità | ~51s | ~13s |
| Flakiness | Alta (backend, dati) | Zero |
| `cy.wait()` arbitrari | Necessari (debounce + network) | Eliminati |
| Dipendenza da ID specifici | Sì (`layer=55`) | No (fixture mockabili) |
| CI senza backend | No | Sì |

### Quando usare API reali

Solo per smoke test ("il sistema è su e risponde"), non per test di logica UI.

## Features implementate

| Feature | Ticket | Moduli toccati | Note |
|---|---|---|---|
| Controllo aggiornamenti app al resume | oc:8174 | `update.service.ts`, `conf.effects.ts` | `startForegroundWatcher` registra `App.addListener('appStateChange')` in `UpdateService`; `checkAppVersion$` chiama watcher + update flow in `concat` |
| Distanza rimanente e posizione nel profilo altimetrico | oc:8177 | `geoutils.service.ts`, `slope-chart.component.*`, `tab-detail.component.*`, `track-live-distance-badge/` (nuovo), `store/user-activity/*`, `store/conf/conf.reducer.ts`/`conf.selector.ts`, `track-properties.component.*`, `constants/track-remaining-distance.ts`, `localization/i18n/*` | Redesign post-merge: card standalone `wm-track-remaining-distance` rimossa, sostituita da badge "km da te" integrati nelle righe Partenza/Arrivo di `tab-detail.component.html`. Dettagli completi in `docs/features/8177-distanza-rimanente-posizione-profilo-altimetrico/notes.md` |
| PostHog tracking utente online | oc:8127 | `geolocation.service.ts`, `posthog-context.service.ts` | Evento `userMoved` ad ogni aggiornamento GPS con campo `mode` (GeolocationMode) |
| Fix regex hostname 5 parti | oc:8031 | `environment.service.ts`, `environment.service.spec.ts` | Regex aggiornata a `(?:\.[^.]+)+` per supportare domini Surge preview a N parti |
| Ricerca per layer/cammino nella home | oc:7643 | `home-result`, `ec` store (actions/reducer/effects/selectors), `layer-box`, `layer-features-counter-badge`, `user-activity.reducer` | |
| Selezione cammino nel form UGC segnalazione | oc:7639 | `select-nearby-layer` (nuovo), `form.component`, `geobox-map`, `modal-ugc-uploader`, `geoutils.service`, `user-activity` store (`nearbyLayerId`), `map-core/layer.directive`, `map-core/ol.ts` | Test E2E: `core/cypress/e2e/app_52/ugc-segnalazione-layer-selection.cy.ts` |
| Unica AddPhotos per ugc-track e ugc-poi | oc:5125 | `ugc-properties-base` (nuovo), `ugc-poi-properties.component.ts`, `ugc-track-properties.component.ts` | Estratta `UgcPropertiesBaseComponent` per condividere `_photos`/`photosChanged()` tra editing POI e track già sincronizzati |
| Etichette Sentiero/POI unificate tra badge e segment | oc:8221 | `layer-features-counter-badge.component.html`, `localization/i18n/{it,en,de,es,fr,pr,sq}.ts` | Badge e home-result usano ora le stesse chiavi i18n (`Sentiero`/`Sentieri`, `Punto di interesse`/`Punti di interesse`); valore di default di `Punti di interesse` accorciato a "POI" in tutte le lingue |
| Fix cache config non ricaricata (header condizionale su cache assente/corrotta) | oc:8374 | `utils/api-cache-handler.ts`, `store/conf/conf.service.ts` | `handleApiCache` non invia più `If-Modified-Since` se `parsedData` è `null` (cache assente in IndexedDB o corrotta, `JSON.parse` fallito); `synchronizedApi.setItem` atteso, `localStorage` non aggiornato se rigetta; nuovo parametro `forceFreshRequest` preserva il caso speciale shard `carg` (sempre fresh fetch); `ConfService.getConf()` non costruisce più l'header autonomamente, delega interamente a `handleApiCache`. `IconsService` beneficia dello stesso fix come effetto collaterale (nessuna modifica diretta) |
| Eliminare log in produzione | oc:8369 | `wm-core.module.ts`, `services/storage.service.ts`, `store/features/ec/ec.service.ts`, `store/features/ugc/ugc.service.ts`, `utils/api-cache-handler.ts`, `utils/localForage.ts`, `buttons/export-to/export-to.component.ts`, `localization/lang.service.ts`, `search-bar/search-bar.component.ts` | Triage manuale `console.*`: rumore cancellato, log diagnostici commentati con `// DEBUG:`, `console.error`/`console.warn` sempre lasciati intatti; `services/posthog-capacitor.client.ts` e `store/features/ec/utils.ts` esclusi (asseriti da test unitari) |
| Logo cammino in backoffice e app (frontend) | oc:8164 | `types/model.ts`, `pipes/wm-has-logo.pipe.ts` (nuovo), `box/layer-box/*`, `home/home-layer/*`, `shared/img/img.component.scss` | Overlay del logo (`logo_image`, stringa URL o assente — backend in oc:8272) in basso a destra su box lista e dettaglio layer, nidificato dentro `<wm-img>` della feature image via content projection. Fix collaterale a `wm-img` (bug preesistente): aggiunto `display:block` all'img interno |
| Condivisione percorso registrato sui social — pulsante, stato UI e gating sync | oc:8183 | `ugc-track-properties.component.ts`/`.html`/`.scss`, `types/eugc-track-share-state.enum.ts` (nuovo), `localization/i18n/{it,en,de,es,fr,pr,sq}.ts`, `ugc-track-properties.component.spec.ts` (nuovo) | Pulsante + stato UI (idle/generating/error, nessun banner di successo); orchestrazione reale in `share.service.ts` (webmapp-app). Nuovo `@Output('share-track')` emette la traccia, nuovo `@Input('shareResult')` riceve l'esito. Il pulsante è disabilitato (Ionic `[disabled]` nativo, nessuna card sovrapposta quindi nessun problema di opacità) finché `isTrackSynced$` non conferma che la traccia ha un `id` dal backend — evita 404 su tracce appena registrate non ancora sincronizzate. Dettagli completi in `docs/features/8183-condivisione-percorso-registrato-sui-social/notes.md` |
| Cuoricino preferiti su layer (wm-layer-box/wm-home-layer) | oc:8176 | `services/layer-favorite.service.ts` (nuovo), `box/layer-box/*`, `home/home-layer/*`, `store/conf/conf.selector.ts`, `services/url-handler.service.ts`, `localization/i18n/*` | Cuoricino di sola lettura su `wm-layer-box` (home/liste), interattivo su `wm-home-layer` e nel tab preferiti (flag `favoriteInteractive`). Dettagli completi in `docs/features/8176-salva-cammino-nei-preferiti/notes.md` |
| Fix layout badge "mi piace"/leggibilità titolo, riposizionamento logo (wm-layer-box) | oc:8305 | `box/layer-box/layer-box.component.scss`, `home/home-layer/home-layer.component.scss`, `theme/mixins.scss` (nuovo mixin `overlay-chip-background`), `core/src/theme/stelvio/global_env.scss` (webmapp-app) | Overlap titolo/badge escluso per costruzione: `.wm-box` da `position:absolute` a CSS Grid a cella condivisa (`display:grid;grid-template:1fr/1fr`, ogni overlay `grid-row:1;grid-column:1` + `align-self`/`justify-self`+`margin`), altezza fissa 180px, titolo `-webkit-line-clamp:3` (deroga esplicita al requisito cliente "sempre completamente leggibile", non riverificata col cliente). Logo da basso-destra ad alto-sinistra, tutte le istanze. Dettagli completi in `docs/features/8305-layout-badge-mi-piace-leggibilita-nome-layer/notes.md` |
| Box informativi configurabili (`wm-config-detail`) | oc:8181 | `config-detail/*` (nuovo), `types/config.ts` (`ILAYER.config_detail`), `wm-core.module.ts`, `home/home-layer/home-layer.component.html`, `track-properties/track-properties.component.html`; tipi in `wm-types/src/config.ts` | Accordion custom (non `ion-accordion`), paginazione 10+"Mostra altro/meno", lazy `innerHTML` embed, iframe responsive senza `aspect-ratio` forzato. Tipi condivisi `ConfigDetailBox*` in `@wm-types/config`. Wiring EcPoi nel repo principale. **Apertura esclusiva sostituita da apertura multipla in oc:8458.** Dettagli in `docs/features/8181-schermata-cammino-con-blocchi-informativi-configurabili/notes.md` |
| Tracciamento bacino di utenza per cammino — user_id in PosthogContextService | oc:8159 | `services/posthog-context.service.ts`, `services/posthog-context.service.spec.ts` (nuovo) | `user_id` (wm-types) popolato dal selettore `auth.user` nel `combineLatest` esistente, su tutti gli eventi capturati, solo se l'utente è loggato. Nessun `identify()` (solo TODO), nessun gate privacy, nessun flag per-shard — decisioni esplicite del developer. Dettagli completi in `docs/features/8159-tracciamento-bacino-di-utenza-per-cammino/notes.md` |
| Base + variante camminiditalia per wm-home-layer | oc:8391 | `home/home-layer/home-layer.component.ts`, `home-layer-base.component.ts` (nuovo), `home-layer.component.camminiditalia.ts` (nuovo), `home-layer.component.camminiditalia.scss` (nuovo), `home-layer-shared.scss` (nuovo), `home-layer-favorite.spec-support.ts` (nuovo) | Estrae `WmHomeLayerBaseComponent` (logica condivisa) e introduce la variante `.camminiditalia` (stesso nome classe, instradata da `fileReplacements` nel repo principale, `core/angular.json`) — sostituisce il vecchio CSS custom `!important` su `1.css`. Verificato con build reale `ng build --configuration=camminiditalia`. Dettagli completi in `docs/features/8391-sostituire-css-custom-home-layer-con-componente-custom/notes.md` (repo principale) |
| Filtri sui cammini in Home (`wm-searchbar` camminiditalia) | oc:8414 | `search-bar/search-bar-base.component.ts` (nuovo), `search-bar/search-bar.component.ts`, `search-bar/search-bar.component.camminiditalia.{ts,html,scss}` (nuovo), `home/home-route-filters/home-route-filter-row/*`, `home/home-route-filters/home-route-filters.utils.ts`, `constants/route-filters.ts` (nuovo), `store/conf/conf.selector.ts`, `store/user-activity/{user-activity.action,reducer,selector}.ts`, `home/home-result/*`, `home/home-landing/home-landing.component.ts`, `wm-core.module.ts`, `localization/i18n/*`; tipi in `wm-types/src/config.ts` | Pannello filtri instradato via `fileReplacements` sulla `wm-searchbar` **preesistente** (non un componente nuovo), con `SearchBarBaseComponent` estratta per la logica di ricerca condivisa. Filtri con testo digitato o attivi mostrano la stessa vista a tab di `wm-home-result`, forzata su sola tab Layers. Dettagli completi in `docs/features/8414-filtri-cammini-home/notes.md` |
| Accordion wm-config-detail: apertura multipla e rimozione scrollIntoView | oc:8458 | `config-detail/config-detail.component.ts`/`.html`/`.spec.ts`, `home/home.component.ts`/`.html` (rimosso `home.component.spec.ts`, interamente dedicato al comportamento rimosso); tipo `ConfigDetailToggleEvent` rimosso in `wm-types/src/config.ts`; consumer rimosso anche in webmapp-app (`map-details.component.ts`) | `_openItem` singolo → `_openItems: Set<...>`, apertura multipla illimitata, `showLess(groupIndex)` chiude solo gli item del proprio gruppo. Rimosso interamente il meccanismo di assestamento oc:8427 (`transitionend`/debounce/fallback/`CustomEvent('configDetailSettled')`) — il suo unico scopo (scroll automatico) è eliminato in questo stesso ciclo. Comportamento condiviso da tutti gli shard, nessuna eccezione. Dettagli completi in `docs/features/8458-accordion-wm-config-detail-apertura-multipla/notes.md` |

## Decisioni architetturali

### Accordion wm-config-detail: apertura multipla e rimozione scrollIntoView (oc:8458)
- **Apertura esclusiva → apertura multipla illimitata**: `_openItem: T|null` sostituito con `_openItems: Set<T>`; nessun tetto al numero di item aperti, nessun meccanismo "chiudi tutto" — rischio di performance con contenuto pesante (iframe multipli) accettato esplicitamente in Fase: challenge, il contenuto di `config_detail` è curato dal backend/content editor.
- **Rimozione integrale, non isolamento, del meccanismo di assestamento oc:8427**: listener `transitionend`, debounce/fallback timer, `CustomEvent('configDetailSettled')` — tutto cancellato insieme, dato che il suo unico consumer (scroll automatico nei due antenati `home.component.ts` e `map-details.component.ts`, webmapp-app) viene rimosso nello stesso ciclo. Se in futuro servisse un hook "item aperto e visibile" (analytics o altro), va riscritto da zero.
- **`showLess(groupIndex)` chiude solo gli item del proprio gruppo**, non più tutti gli item aperti nel componente — un'azione locale (comprimere un gruppo) ha effetto locale. Implementata con una singola chiamata a `_visibleItemsInGroup()` + `shownItems.slice(PAGE_SIZE)`, sfruttando l'invariante che il pulsante "Mostra meno" è renderizzato solo quando il gruppo è già espanso oltre `PAGE_SIZE` (semplificazione fatta in review formale, la prima versione chiamava l'helper due volte con un confronto per riferimento via `Set`, corretta ma inutilmente fragile).
- **Nessun flag `OPTIONS.*` di rollout**: comportamento condiviso da tutti gli shard senza kill switch dedicato — a differenza di altre modifiche UX condivise di questo repo (`showTrackRemainingDistance`, `ugcTrackShareEnabled`, `showFavorites`), giudicato un cambio di interazione minore in Fase: challenge, non abbastanza rischioso da giustificarne uno.
- **`aria-multiselectable="true"` sul contenitore `.wm-config-detail`**: requisito promosso da opzionale a vincolante durante la Fase: challenge — senza, il componente esporrebbe `aria-expanded="true"` su più header contemporaneamente in un contenitore che non dichiara supporto all'espansione multipla, violazione del pattern ARIA accordion standard.
- **`ConfigDetailToggleEvent` rimosso da wm-types**: nessun consumer lo referenzia più dopo la rimozione dell'evento — coerente con la policy di rimozione pulita già applicata in questo progetto (oc:8382). Ordine di esecuzione vincolato: wm-core e webmapp-app devono smettere di importarlo *prima* che wm-types lo rimuova, altrimenti la build TS di chi bump-a il submodule wm-types per primo si rompe.
- **`_elRef`/`ElementRef` lasciato nel costruttore di `ConfigDetailComponent` pur non più letto internamente** (era usato solo dal meccanismo di assestamento rimosso) — scelta deliberata per non allargare la firma del costruttore oltre a quanto pianificato/approvato; nessun impatto funzionale (i parametri costruttore con modificatore di accesso non sono segnalati come "unused" da TypeScript).

### Filtri sui cammini in Home (`wm-searchbar` camminiditalia, oc:8414)
- **Architettura ripensata in corso d'opera**: il piano originale prevedeva un componente nuovo e generico (`HomeRouteFiltersComponent`, gated sui dati) montato accanto a `wm-searchbar` in `home.component.html`. Il developer ha fatto notare che, a differenza di `wm-home-layer` (precedente di riferimento per `fileReplacements`, oc:8391, componente preesistente usato da tutti gli shard), `home-route-filters` era interamente nuovo — tenerne una "versione generica" per shard che non l'hanno mai chiesta non aveva senso. Il pannello filtri è quindi diventato parte della variante camminiditalia della searchbar stessa; `home.component.html`/`.ts` sono tornati esattamente com'erano prima del ticket, nessuna modifica residua.
- **`SearchBarBaseComponent` estratta come deviazione motivata dalla policy generale "mai estrarre una base"** (repo principale, CLAUDE.md): qui il caso è diverso dai due precedenti scartati (`home.component.ts`, `profile.page.ts`) — non è l'intero componente identico con solo stile diverso, è un sottoinsieme di logica (form di ricerca, debounce, dispatch `inputTyped`) genuinamente condiviso al 100%, con la sottoclasse camminiditalia che **aggiunge** funzionalità (stato filtri, pannello) invece di duplicarla con modifiche.
- **`home-route-filter-row` non ha coppia base/camminiditalia**: montato esclusivamente dalla searchbar-camminiditalia, mai da un contesto generico — un'unica implementazione (stile a chip) basta.
- **Stagioni/Portata: enum fisso invece di derivazione dinamica dai dati**, unica eccezione esplicita al requisito del ticket ("mai opzioni hardcoded, sempre derivate dalla config") — richiesta esplicita del developer, circoscritta a questi due filtri con vocabolario chiuso e noto a priori (identico agli enum PHP backend `Season`/`OsmWalkingNetwork`, verificato). Le altre 5 opzioni restano derivate dinamicamente via `Map<string, FilterOption>` (dedup+accumulo per label, non un semplice hash-set: serve il payload count/label per chiave).
- **Comportamento ricerca esteso ai soli filtri attivi**: se ci sono filtri di route attivi (anche senza testo digitato), si attiva la vista a tab di `wm-home-result` forzata sulla sola tab Layers (`showResult`/`showResultTabSelected$` ora considerano anche `hasActiveRouteFilters`) — non previsto nel piano originale, richiesta esplicita dopo demo.
- **Indicatore "filtri attivi" (pallino su `--wm-color-danger` sul toggle)**: scelto tra 4 proposte presentate via Artifact pubblicato — il developer ha scelto la versione senza conteggio numerico.
- **Animazione apertura/chiusura pannello**: trucco CSS `grid-template-rows: 0fr → 1fr` (stesso pattern di `wm-config-detail`, oc:8181), nessuna dipendenza nuova da `@angular/animations`. Le singole righe filtro non sono animate — follow-up noto, non richiesto in questo ciclo.
- **Bug preesistente trovato**: `confMAPLayers` (`conf.selector.ts`) non era null-safe (`state.layers` invece di `state?.layers`) — mai emerso prima perché nessun consumer preesistente lo sottoscriveva prima del caricamento della config; la sottoscrizione diretta di `search-bar.component.camminiditalia.ts` lo ha esposto (eccezione non gestita alla prima emissione disattivava l'observable per sempre). Fix minimo, backward-compatible.
- **4 delle 7 icone SVG (Lunghezza, Tipologia, Temi, Stagioni) sono quelle esatte del sito camminiditalia.org**, fornite dal developer via ispezione DOM manuale — il sito usa Shadow DOM chiuso, che ha impedito qualunque estrazione automatica via tooling. Portata e Regioni restano icone ricreate a mano, non pixel-perfect. Dettagli completi in `docs/features/8414-filtri-cammini-home/notes.md`.

### Eliminare log in produzione (oc:8369)

### Eliminare log in produzione (oc:8369)
- **`wm-core.module.ts:231-289` (validazioni PostHog `appId`/`shardName`/ecc.)**: sono `console.error`/`console.warn` fuori da un `catch`, restano intatti per la regola generale (error/warn sempre visibili anche in prod) — **non** vanno commentati, nonostante siano nello stesso blocco delle diagnostiche di inizializzazione che invece sono state commentate
- **`services/posthog-capacitor.client.ts` e `store/features/ec/utils.ts` esclusi interamente dal triage**: hanno test unitari (`posthog-capacitor.client.spec.ts`, `ec/utils.spec.ts`) che asseriscono esplicitamente sulle chiamate `console.log`/`console.warn` (`expect(...).toHaveBeenCalledWith(...)`, `spyOn`) — qualsiasi modifica li avrebbe rotti
- **`utils/localForage.ts:583` (`updateStatus()`) e `store/features/ec/ec.service.ts:91,150`** ("No changes detected...") commentati (non cancellati): unico segnale diagnostico per, rispettivamente, il download offline tile/hitmap (area fragile, CLAUDE.md oc:8190) e il bug di cache risolto in oc:8374
- **`utils/console-override.ts` resta codice morto**, deliberatamente non attivato in questo ciclo — vedi CLAUDE.md del repo principale (oc:8369) per il contesto completo sul perché

### Fix cache config non ricaricata correttamente (oc:8374)
- **Causa radice**: `ConfService.getConf()` costruiva autonomamente l'header `If-Modified-Since` da `localStorage`, bypassando la logica interna di `handleApiCache` — un fix limitato alla sola utility condivisa non avrebbe risolto il bug reale (segnalato in oc:8357), perché l'header pre-costruito dal chiamante vinceva comunque nello spread `{'If-Modified-Since': cachedLastModified, ...headers}`. Il fix ha dovuto toccare entrambi i livelli
- **Condizione basata su `parsedData`, non su `cachedData` grezzo**: l'header condizionale viene inviato solo se `synchronizedApi.getItem()` risolve un valore che supera anche il `JSON.parse` — copre sia il cache-miss (`null`) sia la cache corrotta (parse fallito), non solo il primo caso
- **`forceFreshRequest` (5° parametro, default `false`) invece di rimuovere il branch `carg`**: lo shard `carg` ha un caso speciale preesistente e intenzionale (commit `d565438b`, "ignore cache on carg shard... ensure fresh data retrieval") — deve *sempre* ricevere dati freschi, mai una richiesta condizionale, indipendentemente dallo stato della cache. Preservato passando `forceFreshRequest: shardName === 'carg'` invece di rimuovere quella logica
- **`getPois()`/`getEcTrack()` (`ec.service.ts`) NON coperti da questo fix**: sono reimplementazioni manuali indipendenti dello stesso pattern di caching condizionale, non usano `handleApiCache` — stesso bug potenzialmente presente, richiede un ticket dedicato
- **Debito tecnico noto, non risolto in questo ciclo**: il next-handler di `handleApiCache` è ora `async` (per `await synchronizedApi.setItem(...)`) — un eventuale `throw` sincrono in `updateData(data)` (fuori dal blocco `try/catch`) diventerebbe una unhandled rejection invece di essere instradato a `observer.error()`, ricreando silenziosamente la stessa classe di bug che questo ticket risolve. Non raggiungibile dai chiamanti attuali (`ConfService`/`IconsService` non possono lanciare), ma da correggere (spostare `updateData(data)` dentro il `try`) se un futuro consumer di questa utility condivisa introduce un `updateData` che può lanciare

### Base + variante camminiditalia per wm-home-layer (oc:8391)
- **Estrazione di una classe Base condivisa (`WmHomeLayerBaseComponent`) tra il componente di default e la variante `.camminiditalia`** — in controtendenza rispetto al precedente documentato nel `CLAUDE.md` del repo principale (estrazione di Base scartata due volte, su `home.component.ts` e `profile.page.ts`). Qui giustificata perché la logica TS tra le due varianti è identica al 100% (cambiano solo template/stile) — trattata come validazione del pattern per questo ciclo, non ancora promossa a policy generale.
- **`@Injectable()` è obbligatorio su qualunque classe Base plain (non-`@Component`) estesa da un `@Component` con parametri costruttore**: senza il decorator, il compilatore Angular non genera la factory DI (`ɵfac`) da cui le sottoclassi ereditano i tipi dei parametri — l'assenza produce `NG0202` **solo a runtime reale**, non rilevato da spec che istanziano il componente con `new` (bypass di Angular DI). Scoperto testando l'app in browser dopo l'implementazione iniziale. Guardia di regressione aggiunta in `home-layer-base.component.spec.ts` (verifica che `ɵfac` sia definito).
- **Il template HTML non è duplicato tra varianti**: solo il `.ts` deve essere gemello per `fileReplacements` (vincolo di schema Angular) — la variante `.camminiditalia` punta allo stesso `templateUrl` del default (`home-layer.component.html`), dato che la struttura DOM non cambia tra le due, solo lo stile via `styleUrls` proprio.
- **SCSS host comune estratto in `home-layer-shared.scss`**, importato sia dal default sia dalla variante — evita di duplicare 1:1 le regole non specifiche della personalizzazione (margini, cuoricino preferiti). A differenza del `.ts`, gli `styleUrls` di componenti diversi possono liberamente condividere partial SCSS senza intaccare il pattern `fileReplacements`.

### Box informativi configurabili (`wm-config-detail`, oc:8181)
- **Tipi in `@wm-types/config`**: `ConfigDetailBox` / `ConfigDetailInfoBox` / `ConfigDetailInfoBoxItem` (senza prefisso `I`); wm-core estende solo `ILAYER.config_detail` e consuma i tipi nel componente.
- **Margine sul wrapper interno, non sul tag host**: `.wm-config-detail` ha `*ngIf="visibleEntries.length"` e porta `--wm-feature-details-margin`; `wm-config-detail` resta `display:block` senza margine — i consumer (`home-layer`, `track-properties`, `poi-properties`) montano sempre il tag host senza `*ngIf` esterno, quindi marginare il host lasciava spazio vuoto quando `config_detail` assente/vuoto.
- **Spacing pulsante "Mostra altro"**: `> *:last-child { margin-bottom: 0 }` sul wrapper (non `:last-of-type` sull'item) + `margin-top: 16px` sul toggle — evita collasso margini tra ultimo item e pulsante.
- **Accordion custom senza `ion-accordion`**: apertura esclusiva tracciata per riferimento-item (`_openItem`), header `<button>` nativo, `aria-expanded`/`aria-controls` manuali; animazione contenuto via `grid-template-rows 0.3s` (interagisce con `ResizeObserver`+debounce 120ms di `map-details`, ~420ms assestamento atteso).
- **Dispatch `box_type` centralizzato nel componente**: i consumer espongono solo `[groups]="…?.config_detail"` — pattern più stretto di `config_home` (no replica selector/template).
- **Due istanze DOM su Layer selezionato**: tab Home (`home.component`) e pannello Map (`map.page`) montano entrambi `wm-home-layer`/`wm-config-detail` per lo stesso layer in store — comportamento accettato; test E2E devono scope a `wm-map-details` con `testIsolation: false`.
- **Riserva accettata**: `_resolve()` duplica fallback di `WmTransPipe` per filtrare righe senza traduzione — non unificato senza conferma (blast radius pipe condiviso).

### Tracciamento bacino di utenza per cammino — user_id in PosthogContextService (oc:8159)
- **Scope volutamente ampio**: `user_id` vive nel contesto condiviso (`_buildContext()`), quindi si applica a **tutti** gli eventi capturati da `capture()` (verificato: 22 call site nel repo), non solo `userMoved`/eventi GPS — decisione esplicita del developer dopo che l'analisi adversariale ne ha quantificato l'ampiezza reale
- **Nessun `identify()` in questo ciclo**: solo un commento `TODO(oc:8159)` nel punto pertinente di `posthog-context.service.ts` — il `distinct_id` di PostHog resta anonimo/per-device come oggi, `user_id` viaggia solo come prop evento
- **Nessun gate di consenso privacy né flag `OPTIONS` per-shard**: coerente con l'assenza di gate su tutto il resto di PostHog nell'app oggi (nessun evento è mai stato gated su `hasPrivacyAgree`) — rischio esplicitamente accettato dal developer, non mitigato in questo ciclo, da ridiscutere se/quando wm-package consumerà il campo per la vista live-position (che il ticket originale oc:8159 promette "anonima")
- **Bug di isolamento test scoperto e risolto in questo ciclo**: `posthog-capacitor.client.spec.ts` è l'unico spec del repo che chiama `TestBed.resetTestingModule()` manualmente in un punto atipico (dentro il corpo sincrono di un `it()`, non in un hook) — questo lascia il `TestBed` in uno stato che un nuovo `describe` eredita come "già istanziato" se non si difende esplicitamente. Fix minimo isolato nel nuovo file (`TestBed.resetTestingModule()` a inizio `beforeEach`), file preesistente non toccato. Se altri nuovi spec dovessero manifestare lo stesso sintomo in futuro, valutare di normalizzare quel file al pattern standard (reset solo in hook)
- **`GeolocationService` è `providedIn: 'root'`**: `Injector.get(GeolocationService, null)` (usato in `PosthogContextService._geolocationSvc`) NON ritorna il default in un `TestBed` isolato se non esplicitamente mockato — Angular trova comunque il provider root e tenta di istanziare l'intera catena (`DeviceService` → `APP_VERSION`). Nei test, mockare `GeolocationService` direttamente (`{provide: GeolocationService, useValue: {location: null}}`), non le sue dipendenze transitive

### Fix layout badge "mi piace"/leggibilità titolo, riposizionamento logo (oc:8305)
- **CSS Grid a cella condivisa invece di `position:absolute`**: scelta esplicita del developer (non solo tecnica) dopo test visivo — tutti gli overlay di `.wm-box` (`.color`, `.wm-box-icon`, foto, logo, titolo, badge) condividono `grid-row:1;grid-column:1` e si posizionano con `align-self`/`justify-self`+`margin`. **Vincolo non ovvio**: se un overlay è nidificato (non figlio diretto di `.wm-box`, es. il logo dentro il `wm-img` della foto), anche il suo genitore reale deve diventare `display:grid` — altrimenti `grid-row`/`grid-column` sul figlio sono silenziosamente inerti (bug trovato e corretto in questo stesso ciclo, vedi `docs/features/8305-.../notes.md`).
- **Titolo troncato a 3 righe (`-webkit-line-clamp:3`+ellipsis), non più illimitato**: deroga esplicita al requisito del cliente ("il nome del layer deve restare sempre completamente leggibile") decisa dal developer dopo un test visivo, **non riverificata con il cliente finale** — rende l'altezza massima del titolo deterministica, escludendo l'overlap col badge per costruzione invece che per margine generoso.
- **Migrare la tecnica di stacking rompe silenziosamente gli override CSS per-shard basati su `top`/`right`/`bottom`/`left`**: `core/src/theme/stelvio/global_env.scss` posizionava il titolo con `top:20%` (funzionava perché il componente usava `position:absolute`) — passato a `position:static` di default con CSS Grid, quel `top:20%` non ha più alcun effetto (nessun errore, il titolo torna semplicemente alla posizione di default del componente). Corretto con `align-self:start;margin-top:36px` — **non** `margin-top:20%`: le percentuali su `margin-top`/`margin-bottom` si risolvono sulla **larghezza** del containing block, non sull'altezza (stessa regola dietro il trick `padding-top:56.25%` per gli aspect-ratio), quindi solo un valore fisso in px replica correttamente il vecchio comportamento quando l'altezza del box è fissa.
- **`geohub/75.css` non toccato ma con un residuo di rischio non verificato**: la sua `line-height:initial !important` su `.wm-box-title` altera il budget "3 righe ≈117px" calcolato per il default — non verificato con il font-family reale di geohub, rischio basso, segnalato in `notes.md`.
- **Mixin `overlay-chip-background` (theme/mixins.scss)**: estratto per il pattern `background-color:rgba(255,255,255,0.85);box-shadow:0 0 4px rgba(0,0,0,0.35)` ripetuto 4 volte identico tra `layer-box.component.scss` e `home-layer.component.scss`.

### Cuoricino preferiti su layer (oc:8176)
- **`wm-layer-box` di sola lettura per default, interattivo solo con `@Input() favoriteInteractive=true`**: le card nella home/liste mostrano solo lo stato preferito (nessun click); l'azione di toggle vive solo su `wm-home-layer` (dettaglio) e nel tab preferiti di webmapp-app dove serve poter rimuovere un preferito dalla lista stessa — scelta del developer dopo verifica visiva, diversa dal piano originale (cuoricino interattivo ovunque)
- **`LayerFavoriteService.toggleWithFeedback()` centralizza toggle+toast+evento PostHog**: `LayerBoxComponent`/`WmHomeLayerComponent` sono thin wrapper che gestiscono solo lo stato locale `isTogglingFavorite`; il servizio inietta direttamente `ToastController`/`LangService`/`POSTHOG_CLIENT`, eliminando la duplicazione trovata in review formale
- **Guardia di staleness `_version` in `LayerFavoriteService`**: `toggle()` e il reset di logout incrementano un contatore; un `getFavorites()` in volo lo confronta al resolve e scarta il proprio risultato (senza segnare `_loaded`) se è cambiato nel frattempo — altrimenti un fetch lento che risolve dopo un toggle concorrente sovrascriverebbe silenziosamente l'aggiornamento più recente
- **Le classi icona reali sono `icon-fill-heart`/`icon-outline-heart`, non `webmapp-icon-heart`/`webmapp-icon-heart-outline`**: queste ultime (copiate da un pattern preesistente in `map-track-card.component.html`, webmapp-app) non esistono nell'icon font del progetto — il cuoricino risultava invisibile. Da verificare se lo stesso bug esiste nel componente tracce (non risolto, fuori scope)
- **Badge conteggio + cuoricino in un'unica pillola** (`.wm-layer-box-badge-combo`) su `wm-layer-box`: `wm-layer-features-counter-badge` (condiviso, usato anche altrove) mantiene la propria logica interna invariata — solo la sua chrome visiva (sfondo/ombra/posizione assoluta) viene neutralizzata via selettore più specifico quando nidificato nel wrapper
- **`UrlHandlerService.setLayer()` (nuovo)**: mirror leggero di `HomeComponent.setLayer()` esistente ma senza i reset di stato UI specifici della Home (`inputTyped`, `closeUgc`, `closeDownloads`, `setHomeResultTabSelected`) — usa `changeURL()` (non `updateURL()`) per navigare correttamente da qualunque pagina, non solo dalla Home dove la mappa è già visibile

### Logo cammino in backoffice e app (oc:8164)

- **`logo_image` è sempre stringa URL semplice o assente/`null`, MAI oggetto `WmImage`** — a differenza di `feature_image`. L'accessor backend (`getFirstMediaUrl('logo') ?: null`, oc:8272) lo garantisce. Non trattarlo con lo stesso pattern di `feature_image` per abitudine.
- **Overlay del badge nidificato dentro `<wm-img>` della feature image via content projection, non come elemento fratello posizionato relativo al contenitore esterno**: la verifica visiva ha mostrato disallineamenti (margini bottom/right diversi, overlay fuori dai confini della foto) quando il badge era posizionato `absolute` relativo a `.wm-box`/wrapper esterno — l'host di quei contenitori non coincide sempre esattamente con i confini renderizzati dell'immagine (es. margini applicati al `wm-img` stesso in `home-layer`). Nidificare il badge dentro il tag `<wm-img>` della feature image (che ha già `position:relative` nel proprio scss) garantisce che l'overlay si posizioni sempre relativo ai confini reali della foto — stesso pattern già usato da `.wm-box-title`.
- **Bug preesistente in `wm-img` risolto come effetto collaterale**: `.wm-img-image` (l'`<img>` interno) non aveva `display:block`, lasciando un "phantom gap" bianco sotto l'immagine (spazio da baseline dell'inline formatting context, comportamento default di un `<img>`). Presente probabilmente ovunque `wm-img` sia usato nell'app, mai notato prima perché mascherato da overlay scuri o perché nessun elemento era mai stato posizionato in modo assoluto relativo ai confini esatti dell'immagine. Fix minimale (`display:block`), nessun effetto collaterale comportamentale.
- **`min-width`/`min-height: 100px` di `wm-img` (default del componente) vince sempre su `width`/`height` più piccoli impostati dal consumer**, indipendentemente dalla specificità CSS — il `min-*` è un vincolo di box model, non una regola di specificità. Qualsiasi overlay/badge più piccolo di 100px basato su `wm-img` deve sovrascrivere esplicitamente anche `min-width`/`min-height`, non solo `width`/`height`.
- **Nessun test unitario aggiunto per `layer-box.component`/`home-layer.component`**: coerente con l'assenza di `.spec.ts` preesistenti su questi due componenti (stesso pattern accettato in oc:8221). Aggiunto solo un test isolato per la pipe pura `hasLogo` (nessuna dipendenza da `TestBed`).
- **Nessuna gestione di errore di caricamento immagine** (URL presente ma non risolvibile, es. media cancellato): `wm-img` non espone un evento `(error)` nella sua pipeline asincrona (`getImg()`, cache offline/localForage) e aggiungerlo avrebbe richiesto modificare un componente condiviso usato ovunque nell'app — sproporzionato per questo ticket. Rischio noto accettato senza mitigazione.

### Condivisione percorso registrato sui social (oc:8183)
- **Nessun nuovo selettore NgRx**: come indicato dal piano, il gating usa `confOPTIONS$` — già dichiarato nel componente ma prima inutilizzato nel template — con `(confOPTIONS$|async)?.ugcTrackShareEnabled`, invece di introdurre un `confOPTIONSUgcTrackShareEnabled` dedicato (pattern usato altrove, es. oc:8177)
- **Contratto Output/Input, non dispatch NgRx**: `@Output('share-track') shareTrack: EventEmitter<WmFeature<LineString>>` emette la traccia corrente al tap (e al retry, stesso metodo `triggerShare()`); il chiamante (webmapp-app) riporta l'esito con `@Input('shareResult') set setShareResult(result: UgcTrackShareResult | null)`, dove `UgcTrackShareResult = {success: boolean; errorMessage?: string}`. `null` è un no-op (valore iniziale prima che il parent abbia qualcosa da riportare). Questo è un contratto proposto lato wm-core, non ancora validato contro l'implementazione reale di `share.service.ts` nel repo principale (task 6 del plan di `webmapp-app`) — vedi notes.md
- **Guardia doppio tap a due livelli**: `triggerShare()` non fa nulla se lo stato è già `GENERATING` (guardia in TS) oltre al `[disabled]` sul bottone nel template
- **Nessun default client-side per `OPTIONS.ugcTrackShareEnabled`** in `conf.reducer.ts` (a differenza di `showTrackRemainingDistance`, oc:8177, che aveva un default temporaneo `true` per i test): il flag resta `undefined` finché un backend non lo abilita esplicitamente via `config.json` — scelta deliberata per una feature nuova, non ancora pronta ovunque
- **Nessun banner di successo/errore in-template**: revisione post-implementazione — l'errore apre un `AlertController` nativo (stesso pattern di `deleteTrack()`), il successo non ha nessun feedback dedicato (la chiusura del native share sheet è già segnale sufficiente). Gli stati interni `SUCCESS`/`ERROR` restano comunque nella state machine (`shareState$`), solo non renderizzati
- **Gating sulla sincronizzazione (`isTrackSynced$`)**: il pannello può aprirsi anche per una traccia appena registrata e non ancora sul backend — il pulsante resta disabilitato (grigio, nativo Ionic) finché `ugcTracksFeatures` non mostra un `id` per quell'`uuid`. Vedi notes.md per il dettaglio completo (perché qui è sicuro usare `[disabled]` nativo, a differenza del chip sovrapposto a una card in `ModalSuccessComponent`, webmapp-app)
- **Test come istanza TS pura, non `TestBed`**: `ugc-track-properties.component.spec.ts` costruisce il componente con `new UgcTrackPropertiesComponent(storeSpy, alertCtrlSpy, langSvcSpy, urlHandlerSvcSpy)`, bypassando la compilazione del template Angular — evita il crash `NG0201` per `APP_TRANSLATION` mancante in DI già documentato sopra (oc:8023) per gli spec di componenti. Dato che il componente ora implementa `ngOnInit()` (per il gating sync), gli spec lo chiamano esplicitamente dopo aver impostato `instance.track` — non parte da sé su un'istanza `new`, solo tramite Angular/TestBed

### Distanza rimanente e posizione nel profilo altimetrico (oc:8177)

Dettagli completi (deviazioni dal piano, bug trovati e fix, ottimizzazioni prestazionali, esito della review formale) in `docs/features/8177-distanza-rimanente-posizione-profilo-altimetrico/notes.md`. Punti principali:

**Redesign post-merge — badge in tab-detail invece della card standalone**: il componente `wm-track-remaining-distance` (card dedicata con un solo valore "distanza al termine del percorso") è stato **rimosso completamente** e sostituito da due badge (`wm-track-live-distance-badge`, nuovo componente condiviso) integrati nelle righe Partenza/Arrivo già esistenti in `tab-detail.component.html` — mostrano rispettivamente la distanza dalla posizione GPS corrente alla partenza (`trackDistanceCovered`, nuovo campo di stato) e all'arrivo (`trackRemainingDistance`, preesistente), perché il sentiero può essere percorso in entrambe le direzioni. Se `properties.from`/`to` non sono presenti ma il flag è attivo e il dato GPS è disponibile, le righe restano visibili con solo il badge (nessun nome). Vedi notes.md per l'elenco completo dei bug di allineamento/font-size/colore risolti durante questo redesign (in breve: avvolgere `ion-note` in un `<div>` per impilare nome+badge gli fa perdere il font-size ridotto che Ionic applica solo ai figli diretti di `ion-item`; `align-items:flex-start` va forzato via `::part(native)`, non sull'host).

- **Proiezione GPS→traccia con OL nativo, non turf.js**: `GeoutilsService.getRemainingDistance()`/`prepareRemainingDistanceContext()` proiettano la posizione via proiezione punto-segmento scritta a mano (`_closestPointOnSegment`/`_findClosestPointAlongLine`) su coordinate riproiettate in EPSG:3857 (`fromLonLat`), non `LineString.getClosestPoint()` di OL — serve conoscere l'indice di segmento e vincolare la ricerca a una finestra locale attorno all'ultimo `trackProgress` noto, per evitare oscillazioni su tracce ad anello/con tratti sovrapposti (comuni nei Cammini d'Italia); `getClosestPoint()` non espone né l'indice né un modo nativo per limitare la ricerca a una sotto-porzione della linea
- **`remainingDistance` calcolata dalla stessa fonte usata dal grafico**: `SlopeChartComponent` ora chiama `GeoutilsService.getHaversineTrackLength()` per il totale invece di accumularlo internamente, per garantire che il totale mostrato nel grafico e la distanza rimanente non divergano mai numericamente
- **Cache del contesto geometrico per traccia**: `prepareRemainingDistanceContext()` (riproiezione 3857 + distanze cumulative) va calcolato una sola volta per traccia e cacheato dal chiamante (`UserActivityEffects._currentTrackContext`) — passarci la geometria grezza ad ogni fix GPS ripete O(n) di lavoro inutilmente
- **Palette blu fissa (`#4285F4`) per gli indicatori di posizione GPS live** (marker sul grafico, pallino su "Pendenza" quando la fonte è GPS, card `wm-track-remaining-distance`), non theme-driven (`--wm-color-primary`) — il marker "sei qui" sulla mappa (`WmMapPositionDirective`, map-core) è già un asset PNG a colore fisso, non legato al tema; usare il primary color altrove creerebbe un'incoerenza visiva tra istanze con brand diverso. Lo stato "GPS non aggiornato" resta invece legato a `--wm-color-warning` (semantica di warning, non di brand)
- **Flag `OPTIONS.showTrackRemainingDistance` (wm-types) copre solo la card**, non il marker/pendenza sul grafico — scelta esplicita del developer; default client-side temporaneo `true` in `conf.reducer.ts` (marcato `TODO(oc:8177)`, da portare a `false` prima del rollout definitivo)
- **Bug Chart.js risolti**: il tooltip di hover resta "bloccato attivo" perché `options.events` non include `touchend`/`mouseout` — causa radice di tre sintomi distinti: (1) il marker GPS sul grafico restava nascosto per sempre dopo un tocco (fix: timer di dismissal agganciato a `onHover`, non a `beforeTooltipDraw` che si rifà anche su update programmatici), (2) posizionamento del marker errato su `CategoryScale.getPixelForValue()` che ignora l'indice passato (fix: posizione letta da `chart.getDatasetMeta(0).data[index]`), (3) pallino/segmento hover sulla **mappa** (map-core, `track.directive.ts`) mai rimossi dopo il tocco — bug distinto, corretto in quel submodule
- **Naming convention interfacce**: nuove interfacce (`RemainingDistanceContext`, `RemainingDistanceResult` in `geoutils.service.ts`) **senza** prefisso `I` — CLAUDE.md documenta ancora "I prefix + PascalCase" ma il team lo sta rimuovendo gradualmente (correzione esplicita del developer)
- **Chiavi i18n in italiano**: le chiavi introdotte da questa feature (`'al termine del percorso'`, `'del percorso completato'`, `'Posizione GPS non aggiornata'`) usano il testo italiano stesso come chiave invece della forma inglese — pattern già presente altrove nei file i18n (es. `'Filtri'`, `'Cerca'`), su richiesta esplicita ("la lingua principale dei testi deve essere l'italiano")

### Etichette Sentiero/POI unificate tra badge e segment (oc:8221)
- **Causa radice non era solo terminologica ma strutturale**: `wm-layer-features-counter-badge` e `wm-home-result` usavano due chiavi i18n indipendenti per lo stesso concetto (`'Percorso'/'Percorsi'`+`'Luogo'/'Luoghi'` nel badge vs `'Sentieri'`+`'Punti di interesse'` nel segment) — correggere il testo in un solo punto avrebbe lasciato l'altro disallineato. Fix: badge migrato per usare le stesse chiavi del segment (`'Sentiero'/'Sentieri'`, `'Punto di interesse'/'Punti di interesse'`)
- **Valore di default "POI" è un cambio globale, non solo per Forestas**: applicato a tutte le istanze che usano wm-core, per motivi di spazio in UI. Pattern di override già esistente e consolidato (vedi oc:7643, chiave `'layers'`): un'istanza che preferisca il testo esteso può fare override via `config.json` → `ICONF.TRANSLATIONS` senza toccare wm-core
- **Ordine di merge delle traduzioni verificato in `LangService._init()`**: default hardcoded → `APP_TRANSLATION` (build-time, per istanza) → `conf.TRANSLATIONS` da `config.json` (runtime, applicato per ultimo con `setTranslation(lang, translations[lang], true)`) — un override di produzione già esistente su una chiave sopravvive sempre al cambio del default globale, perché applicato dopo
- **Chiavi orfane `Percorso`/`Percorsi`/`Luogo`/`Luoghi` mantenute deliberatamente, non rimosse**: nessun componente le referenzia più dopo la migrazione del badge, ma rimuoverle rischierebbe di rompere silenziosamente un eventuale override di produzione non ispezionabile da questo repo. Debito tecnico consapevole, da riconsiderare solo dopo un audit dei `config.json` di produzione
- **Nessun test di regressione aggiunto per garantire l'allineamento futuro badge/segment**: i test Karma dei componenti in wm-core/map-core sono esclusi dalla CI (vedi oc:8023, `angular.json`/`tsconfig.spec.json` limitano la discovery a `src/app/services/**`) per crash pregressi (`NG0201` su `APP_TRANSLATION` mancante in DI). Un test Cypress e2e sarebbe stato l'alternativa valida ma avrebbe richiesto nuove fixture, sproporzionato per lo scope di un Bug fix — rischio di recidiva accettato e documentato invece di mitigato con automazione

### Unica AddPhotos per ugc-track e ugc-poi (oc:5125)
- **`ModalSaveComponent` (repo principale) era già unificato**: il flusso di registrazione GPS (nuovo track/POI) usa un solo `ModalSaveComponent` con flag `isWaypoint`, non due componenti separati. Il ticket originale referenziava nomi obsoleti (`modal-save.component`/`modal-waypoint-save.component`) — la vera duplicazione residua era nel flusso di *editing* di UGC già sincronizzati, tra `ugc-poi-properties.component.ts` e `ugc-track-properties.component.ts`
- **`UgcPropertiesBaseComponent` è una classe astratta plain-TS, non un `@Component` Angular**: nessuna injection, nessun decoratore, nessun template — condivide solo `_photos`/`photosChanged()`/getter `photos`. Scelta preferita a un servizio iniettato perché lo stato è intrinsecamente per-istanza (POI vs track), non cross-cutting
- **`draw-ugc.component.ts` esplicitamente fuori scope**: usa `Photo[]` di Capacitor (foto locali, mai sincronizzate) invece di `Media[]`, un modello dati diverso da quello di editing — unificarlo avrebbe forzato un'astrazione tra tipi semanticamente distinti
- **`_buildFormData()` in `ugc.service.ts` gestisce già foto locali miste a foto sincronizzate**: filtra `media.filter(p => !p.id)` e le allega come file multipart (`images[]`) nella stessa richiesta di update — non serve nessuna logica aggiuntiva per questo caso nella base class
- **Debito noto, non affrontato in questo ticket**: `slideOptions`, `isEditing$`, `confOPTIONS$`, `deletePoi()`/`deleteTrack()` restano duplicati identici tra i due componenti — candidati per un refactoring successivo, fuori scope perché il ticket copriva solo AddPhotos

### Controllo aggiornamenti app al resume (oc:8174)
- **`startForegroundWatcher` in `UpdateService`**: il listener Capacitor `appStateChange` vive nel service (non in un effect NgRx), così il service rimane testabile in isolamento e il ciclo di vita del listener è disaccoppiato dallo store. `checkAppVersion$` lo avvia come side-effect la prima volta che l'azione viene dispatchata.
- **`concat` invece di `Promise.all`**: le due operazioni (`startForegroundWatcher` + `handleAppUpdateFlow`) sono sequenziali e con `catchError(() => EMPTY)` indipendente — se il watcher non si registra, il controllo versione parte comunque.
- **`await remove()` prima di re-registrare**: `PluginListenerHandle.remove()` è asincrono; senza `await` c'è una finestra in cui due listener sono attivi contemporaneamente e `handleAppUpdateFlow` viene chiamato due volte sullo stesso resume.
- **Guard `isAppMobile` nel service, non nell'effect**: l'effect non sa nulla della piattaforma — il service incapsula la guardia, restituisce `Promise<void>` silenziosamente su browser.

### PostHog tracking utente online (oc:8127)
- **`capture('userMoved')` in `GeolocationService._onLocationUpdate()`**: elimina la dipendenza circolare alla radice. `GeolocationService` ha già `_mode` e `_posthogClient` — non serve nessun workaround lazy. L'evento si attiva ad ogni aggiornamento GPS; il foreground/background è implicito nel watcher.
- **`GeolocationMode` in wm-types**: tipo condiviso `'navigation' | 'recording' | 'stopped'` estratto in `wm-types/user-activity.ts`. Usato da `GeolocationService` e `WmPosthogProps.mode` per evitare la union literal ripetuta.

### Fix regex hostname 5 parti (oc:8031)

- **`(?:\.[^.]+)+` invece di gruppi opzionali fissi**: accetta N parti TLD senza dover patchare la regex ad ogni nuovo provider o variante di dominio (es. Surge preview `pr-N.surge.sh`)
- **Test spec su regex privata via `(service as any)`**: proprietà mantenuta `private`; guard `expect(regex).toBeDefined()` cattura rename silenziosi
- **Rischio preesistente non affrontato**: `_assignApi()` crasha se `shardName` non è in `environment.shards` — da tracciare in ticket separato

### Tab layers nella home (oc:7643)

**Store**

- `HomeResultTab` (`wm-types`) include `'layers' | null` — `null` come stato iniziale distingue "nessuna scelta utente" da "utente ha cliccato tracks esplicitamente"
- `homeResultTabSelected` si resetta a `null` ad ogni `inputTyped` — permette al default di tornare a `'layers'` dopo ogni nuova digitazione
- `ecTracksInitAggregationsSuccess` è un'azione dedicata che aggiorna **solo** `initialAggregations` nello store — non tocca `hits` né `aggregations` per non sporcare i risultati di ricerca correnti
- L'effetto `initLayerAggregations$` si attiva su `loadConfSuccess` e chiama `ecSvc.getQuery({})` senza parametri per ottenere le aggregazioni iniziali non filtrate

**Selettori**

- `layerFeaturesTotalCount` usa `initialAggregationBucketsLayers` (da `initialAggregations`) — il contatore badge non cambia al variare della query di ricerca
- `layerFeaturesCount` usa le aggregazioni filtrate correnti — usato ovunque tranne che nella tab layers della home

**Componente home-result**

- `normalizeString()` è una funzione pura a livello di modulo (non metodo di classe) per evitare problemi con gli initializer delle property che non possono chiamare metodi di istanza
- `filteredLayers$`, `countLayers$`, `showResultTabSelected$` sono inizializzati nel costruttore (non come property initializer) per lo stesso motivo
- `ecLayer` è aggiunto al `combineLatest` con `.pipe(startWith(null))` — senza questo, la prima emissione veniva bloccata finché `ecLayer` non emetteva
- Logica `showResultTabSelected$`:
  1. Se l'utente ha cliccato esplicitamente un tab valido → mostra quel tab
  2. Se ci sono layer disponibili (e nessun layer aperto) → mostra `'layers'`
  3. Fallback: `'tracks'` → `'pois'` → `null`

**i18n**

- Chiave `'layers'` con traduzione di default `'Layers'` in tutti i file i18n
- Il backend fa override via `wmlang` per ogni app (es. "Cammini", "Percorsi", "Itinerari")
- `LangService.instant(layer.title as any)` risolve sia stringhe che oggetti `{it: '...', en: '...'}` — necessario perché i titoli dei layer dalla conf sono oggetti i18n, non stringhe

**layer-box**

- `@Input() showBadge = true` — permette di nascondere il badge (usato in altri contesti)
- `@Input() useTotal = false` — quando `true` il badge usa `layerFeaturesTotalCount` (non filtrato)

### Selezione layer nel form UGC segnalazione (oc:7639)

**Pipeline pre-selezione GPS**

La pre-selezione non avviene nel componente form. Segue una pipeline in tre stadi:
1. `WmMapLayerDirective.refreshFeaturesInLocationRange(location)` fetcha tile PBF a zoom fisso via `loadVectorTileFeaturesForLocation` (map-core) — indipendente dallo zoom corrente della mappa
2. `GeoboxMapComponent.featuresInLocationRange(features)` chiama `GeoutilsService.pickNearestLayerFromFeatures()` e dispatcha `setNearbyLayerId` allo store
3. `WmSelectNearbyLayerComponent` legge da `combineLatest([confHOMELayers, currentEcLayer, store.select(nearbyLayerId)])` e applica priorità: `currentEcLayer` → `nearbyLayerId`

**Perché non `source.getFeaturesInExtent()`**

`getFeaturesInExtent()` legge solo tile già renderizzati in viewport: se la mappa è a zoom alto o il modal si apre prima del render, le feature non ci sono. `loadVectorTileFeaturesForLocation` fetcha i tile a zoom fisso basso indipendentemente dallo stato del viewport.

**Comportamento al confine tra tile PBF — gestito correttamente**

Il buffer da 1500m viene applicato **prima** di calcolare quali tile fetchare. Se il GPS è vicino al bordo di una tile, l'extent espanso sconfina nella tile adiacente e `getTilesForExtent` include entrambe nel fetch. Una feature nella tile adiacente a 50m viene trovata correttamente anche se la tile del punto GPS contiene solo feature lontane. L'unico limite è il raggio: feature oltre 1500m non vengono cercate per design.

**`pickNearestLayerFromFeatures` vs `getNearestLayer`**

Il metodo in `GeoutilsService` si chiama `pickNearestLayerFromFeatures(features, location, homeLayers)` — non `getNearestLayer`. Non riceve `OlMap` come parametro. Gestisce `RenderFeature` con `toFeature()`.

**`currentEcLayer` non `currentLayer`**

Il selettore corretto è `currentEcLayer` da `user-activity.selector.ts`. Il selettore `currentLayer` non esiste.

**`featuresInLocationRangeEVT` emette `{features, location}` non solo `features`**

La location viaggia con le feature per evitare stato condiviso fragile (`_lastLocationRangeRefresh` era un campo di classe che poteva essere sovrascritto tra chiamate concorrenti). `GeoboxMapComponent.featuresInLocationRange` usa `async`/`firstValueFrom` invece di `subscribe` imperativo.

**CVA `WmSelectNearbyLayerComponent` — propagazione al form ricreato**

Quando `WmFormComponent.setForm()` ricrea il `FormGroup`, Angular chiama `registerOnChange(newFn)`. Se il combineLatest dello store non ri-emette, `_onChange` non verrebbe mai chiamato con il nuovo form control. Fix: `registerOnChange` propaga immediatamente il valore se `_lastResolvedLayer` è noto; `_applyPreselection` chiama sempre `_onChange` (non solo quando il layer cambia visivamente).

**`layer_id` top-level va estratto in tutti i componenti di salvataggio**

Il flusso POI segnalazione usa `ModalSaveComponent` (non `ModalUgcUploaderComponent`). Entrambi devono usare `...(formValue?.layer_id != null && {layer_id: formValue.layer_id})` per non inviare `layer_id: null` al backend.

**`WmFormComponent.confPOIFORMS` setter accetta `null`**

Il setter è dichiarato `any[] | null` con guard `if (forms == null) return`. Necessario perché `X | async` in strict Angular template produce `T | null` — senza il `null` nel tipo il compiler segnala un errore. Tutti i template che usano `[confPOIFORMS]="obs$|async"` senza `?? []` dipendono da questo.

**`WmFormComponent.setForm()` — il form group va costruito fuori dal forEach**

Le righe `this.formGroup = this._fb.group(formObj)`, `formGroupEvt.emit`, `isInvalidEvt.emit` devono stare **dopo** il `forEach` sui campi, non dentro. Dentro il loop accumulare solo `formObj[field.name]`.

**Subscription management in `WmFormComponent`**

Usare `takeUntil(this._destroy$)` con un `Subject<void>` per tutte le subscription (sia `formIdGroup.valueChanges` che `formGroup.valueChanges`). La gestione manuale con `Subscription` causava leak perché le subscription vecchie di `formGroup.valueChanges` non venivano mai chiuse al cambio form.
