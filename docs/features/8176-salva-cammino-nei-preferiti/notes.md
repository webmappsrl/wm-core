> Ticket: oc:8176

# Notes — Salva cammino nei preferiti (wm-core)

## Deviazioni dal piano

**Cuoricino su `wm-layer-box` reso di sola lettura, invece che interattivo.** Il piano originale (approvato) prevedeva un cuoricino toggle interattivo identico su entrambi `wm-layer-box` e `wm-home-layer`. Dopo una verifica visiva del developer sulla build reale, è emerso che:
- Il cuoricino si sovrapponeva al badge `wm-layer-features-counter-badge` (entrambi posizionati in alto a destra sulla card)
- Il developer ha richiesto esplicitamente che su `wm-layer-box` (card nella home/lista) il cuoricino sia solo un **indicatore di stato** (sola lettura, più piccolo, spostato sotto il badge), mentre l'azione di toggle resti disponibile solo nella schermata di dettaglio (`wm-home-layer`)

Modifiche conseguenti in `layer-box.component.ts`: rimossi `onFavoriteClick()`, `isTogglingFavorite`, l'iniezione di `ToastController`, e l'emissione dell'evento PostHog `layerFavorited` (ora emesso solo da `home-layer.component.ts`, unico punto dove avviene un toggle reale). Il componente mantiene solo `isFavorite$`/`showFavoriteHeart$` per la sola proiezione di stato. Test aggiornati di conseguenza (rimossi i test su toggle/toast/posthog per `layer-box`, sostituiti con test di sola visibilità/stato).

Impatto sulla stima: cambiamento post-approvazione, ma a costo trascurabile (semplifica il componente, non lo complica).

## Bug trovati

**Cuoricino invisibile in produzione (né stato preferito né non-preferito).** Le classi CSS usate nel template (`webmapp-icon-heart`/`webmapp-icon-heart-outline`) non esistono nell'icon font del progetto (`core/src/assets/icons/webmapp-icons/style.css`) — erano state copiate da un pattern già presente (e apparentemente già rotto, mai notato) in `map-track-card.component.html` nel repo principale. Le classi reali dell'icon font, verificate contro due usi funzionanti nello stesso repo (`tabs.page.html`, `map.page.html`), sono `icon-fill-heart` (stato preferito) e `icon-outline-heart` (stato non preferito). Corretto in `layer-box.component.html` e `home-layer.component.html`.

Non è stato investigato/corretto il bug gemello preesistente in `map-track-card.component.html` (fuori scope di questo ticket) — se il cuoricino delle tracce preferite risultasse a sua volta invisibile in produzione, è la stessa causa.

## Decisioni

- Posizionamento del cuoricino di sola lettura su `layer-box`: `top: 52px; right: 16px` (badge a `top: 16px; right: 16px`, altezza approssimativa badge ~28-32px + margine), dimensione 28×28px, `pointer-events: none` esplicito nonostante l'assenza di click handler (difesa aggiuntiva contro futuri click accidentali se qualcuno aggiungesse per errore un listener sul contenitore genitore).
- Nuove chiavi i18n `Preferito`/`Non preferito` (aria-label statico per la versione di sola lettura), aggiunte nelle 7 lingue accanto alle chiavi esistenti `Aggiungi ai preferiti`/`Rimuovi dai preferiti` (rimaste, usate solo da `home-layer`).

## Follow-up

- Verificare (in un ticket separato, fuori scope) se `map-track-card.component.html` ha lo stesso bug di classe icona inesistente per il cuoricino tracce.
- Il posizionamento a pixel fissi (`top: 52px`) sotto il badge è una stima basata sull'altezza tipica del badge con contenuto breve ("N Sentieri") — da verificare visivamente su badge con testo più lungo o a doppia riga (es. localizzazioni con parole più lunghe).
- `favoriteInteractive` come flag su `LayerBoxComponent` resta (non scomposto in due componenti separati) — valutato debito accettabile dopo l'estrazione di `toggleWithFeedback()`, che ha già rimosso la parte più rilevante di business logic dal componente box.
- Endpoint `add`/`remove` (wm-package) senza consumer reale oggi — lasciati per parità con `EcTrackController`, non rimossi.

## Seconda deviazione — cuoricino interattivo reintrodotto dietro flag opt-in

Dopo la revisione visiva, il developer ha segnalato due problemi concreti causati dal cuoricino reso di sola lettura in `wm-layer-box`:
1. Nel tab "Cammini" della pagina Preferiti (webmapp-app), che riusa `wm-layer-box` per renderizzare la lista, non era più possibile rimuovere un preferito (il cuoricino era di sola lettura ovunque, incluso lì).
2. Il click sulla card nel tab Cammini non apriva il layer sulla mappa, a differenza del click sullo stesso box dalla Home.

**Fix**: aggiunto `@Input() favoriteInteractive = false` a `LayerBoxComponent` — default `false` (sola lettura, comportamento delle card in home/lista, invariato), `true` solo quando il consumer lo richiede esplicitamente. `onFavoriteClick()` ora fa early-return se `favoriteInteractive` è `false` (nessuna azione, nessuno `stopPropagation`). Il template applica un modificatore CSS `--interactive` che ripristina l'area di tap 44×44px (invece di 28×28px) e il cursore pointer solo quando il flag è attivo.

`webmapp-app`'s `FavouritesLayersComponent` passa `[favoriteInteractive]="true"` sul `wm-layer-box` del tab Cammini — unico consumer che ne ha bisogno oggi.

**Navigazione al click**: `LayerBoxComponent.onClick()` emette solo `clickEVT` (comportamento generico esistente, invariato) — la navigazione reale verso la mappa è responsabilità del consumer. Dalla Home, `HomeComponent.setLayer()` gestisce già questo (aggiorna URL + stato NgRx specifico della Home: tab risultati, pannelli UGC/download). Per riusare "esattamente" questo comportamento da un'altra pagina (Preferiti, fuori dal contesto Home), è stato aggiunto un nuovo metodo **`UrlHandlerService.setLayer(layer)`** (mirror di `setTrack()`/`setPoi()` già esistenti sullo stesso servizio, stesso pattern: `updateURL({layer: id}, ['map'])` + `setMapDetailsStatus({status: 'open'})`) — non i dispatch specifici della Home (`inputTyped`, `closeUgc`, `closeDownloads`, `setHomeResultTabSelected`), che non hanno senso applicati da una pagina diversa da Home. `HomeComponent.setLayer()` non è stato toccato (nessun rischio di regressione sul comportamento esistente della Home).

## Terza revisione — impaginazione cuoricino (scelta dal developer su mockup)

Sono state proposte 4 impaginazioni via mockup HTML (Artifact), il developer ha scelto la **variante B**: badge conteggio sentieri e cuoricino condividono un'unica pillola (divisore verticale tra i due), invece di due elementi separati sovrapposti/impilati. Colore del cuore: **cremisi `#D7263D`** (era nero, non abbastanza "da cuore").

Implementazione in `layer-box.component.html`/`.scss`:
- Nuovo wrapper `.wm-layer-box-badge-combo` (assoluto, `top:16px; right:16px`, stessa posizione che aveva prima solo il badge) contiene sia `<wm-layer-features-counter-badge>` sia (se `showFavoriteHeart$`) un divisore + il cuoricino.
- Il componente badge (`wm-layer-features-counter-badge`, condiviso/usato altrove) mantiene la propria logica interna invariata — solo la sua chrome visiva (sfondo, ombra, posizionamento assoluto) viene neutralizzata via selettore più specifico dal wrapper, in modo che la pillola visibile sia una sola. Nessuna modifica al componente badge stesso.
- Se `showFavoriteHeart$` è `false` (flag disattivato o utente anonimo), il wrapper contiene solo il badge — nessun cambiamento visivo rispetto a prima di questa feature.
- Colore cuore applicato via CSS custom property `--wm-color-favorite` con fallback `#d7263d`, sia in `layer-box` che in `home-layer` (per coerenza) — permette un futuro override da tema senza toccare di nuovo questo codice.

**Bug di dimensionamento nel tab Preferiti risolto in parallelo** (notato dal developer negli screenshot, non originariamente in scope): `wm-layer-box` dentro `<ion-list>` in `FavouritesLayersComponent` (webmapp-app) collassava a un'altezza molto inferiore ai 176px della Home, perché `.wm-box` (`height:100%`) non aveva un containing block con altezza definita — fix in `favourites-layers.component.scss` (webmapp-app), altezza esplicita `176px` sull'host `wm-layer-box`.

## Review formale (`wm-skills:wm-review-ticket`) — findings corretti prima del merge

Eseguita una review con 5 finder paralleli sul diff cumulativo dei 4 repo. Fix applicati:

- **[blocker] Race condition in `toggle()`** — a differenza di `getFavorites()` (che già scartava fetch tardivi via confronto `_fetchPromise`), `toggle()` scriveva sempre incondizionatamente in `_favorites$`. Scenario: un `getFavorites()` lento in volo che risolve DOPO un toggle concorrente sovrascriveva silenziosamente l'aggiornamento ottimistico più recente con uno snapshot superato del server. Fix: contatore `_version`, incrementato da `toggle()` e dal reset di logout; un fetch confronta `_version` all'avvio con quella al resolve e scarta il proprio risultato (senza segnare `_loaded`) se è cambiata nel frattempo. Nuovo test dedicato + un test preesistente riscritto in un `describe` isolato perché la sua premessa ("nessun fetch in volo prima del toggle") era in conflitto con l'auto-fetch al login introdotto in un fix precedente.
- **[cleanup] Toast di errore non tradotto** — `'Impossibile aggiornare i preferiti, riprova'` era una stringa italiana hardcoded in `layer-box.component.ts`/`home-layer.component.ts`, non passata da `LangService`. Aggiunta chiave i18n nelle 7 lingue, sostituito con `this._langSvc.instant(...)`.
- **[cleanup] `.webmapp-favourites-nodata` non si applicava nel tab Cammini** — la classe vive in `favourites.page.scss`, ma `FavouritesLayersComponent` (webmapp-app) è un componente figlio con `ViewEncapsulation.Emulated` di default: lo stile non attraversa il confine di vista. Ridefinita identica in `favourites-layers.component.scss`.

## Seconda passata sui cleanup (su richiesta esplicita del developer)

- **Logica `onFavoriteClick` duplicata** (era il primo item della lista sopra): estratto un nuovo metodo `LayerFavoriteService.toggleWithFeedback(layer)` che centralizza guardia anti-pending, toggle, toast di errore (via `LangService`/`ToastController` ora iniettati nel servizio) ed evento PostHog `layerFavorited`. `LayerBoxComponent.onFavoriteClick()` e `WmHomeLayerComponent.onFavoriteClick()` sono ora entrambi thin wrapper: impostano/resettano `isTogglingFavorite` (stato locale di presentazione, resta nel componente) attorno a un'unica chiamata a `toggleWithFeedback()`. Questo risolve anche gran parte del secondo item (business logic spostata dal componente box al servizio) — `LayerBoxComponent` mantiene `POSTHOG_CLIENT` solo per l'evento `layerOpened` preesistente (non legato ai preferiti), non più per `layerFavorited`.
- **`trackBy` mancante**: aggiunto `trackByLayerId` in `FavouritesLayersComponent` (webmapp-app) — un toggle nella lista preferiti ora ricrea solo la card effettivamente toccata.
- **Endpoint `add`/`remove` senza consumer reale**: lasciati invariati (non rimossi) — mirror deliberato di `EcTrackController`, già testati; rimuoverli avrebbe ridotto la parità con il pattern gemello senza un beneficio chiaro. Debito accettato, non "cleanup" nel senso di codice da correggere.

Tutti gli spec dei componenti/servizio riscritti di conseguenza (nuovi mock per `ToastController`/`LangService` sul servizio, rimossi dai due componenti). Suite completa verde dopo il refactor (204/204).

## Terza revisione — cuoricino interattivo anche in home + tracking su rimozione (su richiesta esplicita del developer)

- **`favoriteInteractive` ora `true` anche in home**: aggiunto `[favoriteInteractive]="true"` a `wm-layer-box` in `home-landing.component.html` e `home-result.component.html` — il developer ha cambiato idea rispetto alla decisione della seconda revisione (sola lettura in home). Il default dell'`@Input()` resta `false` (rete di sicurezza per consumer futuri non aggiornati esplicitamente), ma oggi tutti i consumer noti (home-landing, home-result, tab "Cammini" in Preferiti) lo impostano a `true` — nessun consumer usa più la modalità sola-lettura.
- **Evento PostHog `layerFavorited` ora anche su rimozione**: `toggleWithFeedback()` emette l'evento sia su add sia su remove, distinti da una nuova prop `favorite: boolean`. Richiede l'aggiunta di `favorite?: boolean` a `WmPosthogProps` (wm-types, tipo condiviso già esteso incrementalmente per ogni evento specifico — stesso pattern di `layer_name`/`layer_label` per `layerOpened`).
- **Convenzione i18n corretta**: il developer ha modificato a mano `favourites.page.html` per usare chiavi flat testo-semplice (`'Layers'`, `'Sentieri'`) invece di chiavi "a percorso" (`pages.favourites.tabs.tracks`) — quest'ultimo pattern non è la convenzione del progetto (che usa il testo italiano stesso come chiave, es. `'Preferito'`, `'Aggiungi ai preferiti'`, già seguita correttamente per le chiavi introdotte in wm-core). Trovato e corretto un secondo caso analogo introdotto da questa stessa feature (`pages.favourites.nodataLayers` in `favourites-layers.component.html`, webmapp-app) — vedi `webmapp-app/docs/features/8176-salva-cammino-nei-preferiti/notes.md` per il dettaglio completo delle chiavi spostate nelle 7 lingue.
