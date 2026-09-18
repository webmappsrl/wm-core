# `wm-layer-box` e `wm-home-layer`: overlay, logo e preferiti

## Come funziona oggi

**Tutti gli overlay di `.wm-box` condividono una sola cella di CSS Grid.** Colore, icona, foto, logo, titolo e badge hanno `grid-row:1;grid-column:1` e si posizionano con `align-self`/`justify-self` più `margin`, non con `position:absolute`. Il box ha altezza fissa 180px e il titolo è troncato a 3 righe (`-webkit-line-clamp:3`).

**Il logo è nidificato dentro `<wm-img>`** della feature image via content projection, non è un fratello posizionato rispetto al contenitore esterno. `logo_image` è **sempre** una stringa URL o assente/`null`, mai un oggetto `WmImage` come `feature_image`: lo garantisce l'accessor backend `getFirstMediaUrl('logo') ?: null`.

**Il cuoricino preferiti è di sola lettura su `wm-layer-box`** e interattivo solo con `@Input() favoriteInteractive=true`, cioè su `wm-home-layer` e nel tab preferiti. `LayerFavoriteService.toggleWithFeedback()` centralizza toggle, toast ed evento PostHog; i componenti sono wrapper sottili che tengono solo `isTogglingFavorite`. Su `wm-layer-box` badge di conteggio e cuoricino stanno in un'unica pillola (`.wm-layer-box-badge-combo`).

Il mixin `overlay-chip-background` in `theme/mixins.scss` tiene il pattern `background-color:rgba(255,255,255,0.85);box-shadow:0 0 4px rgba(0,0,0,0.35)`, prima ripetuto identico quattro volte.

## Perché così

- **CSS Grid invece di `position:absolute`** (oc:8305): scelta del developer dopo un test visivo, non solo tecnica. L'overlap fra titolo e badge è escluso per costruzione — l'altezza massima del titolo diventa deterministica — invece che per margine generoso.
- **Il troncamento a 3 righe è una deroga esplicita** (oc:8305) al requisito del cliente «il nome del layer deve restare sempre completamente leggibile», decisa dal developer e **non riverificata con il cliente finale**.
- **Il logo va dentro `<wm-img>`** (oc:8164): posizionato `absolute` rispetto a `.wm-box` o al wrapper esterno mostrava disallineamenti, perché l'host di quei contenitori non coincide sempre con i confini renderizzati dell'immagine. `<wm-img>` ha già `position:relative` nel proprio scss, quindi l'overlay si posiziona sui confini reali della foto — lo stesso pattern di `.wm-box-title`.
- **Il toggle dei preferiti sta solo dove serve agire** (oc:8176): le card in home e nelle liste mostrano lo stato, l'azione vive nel dettaglio e nel tab preferiti, dove serve poter rimuovere un elemento dalla lista stessa. Diverso dal piano originale, che voleva il cuoricino interattivo ovunque.
- **`UrlHandlerService.setLayer()` usa `changeURL()`, non `updateURL()`** (oc:8176): è un mirror leggero di `HomeComponent.setLayer()` senza i reset di stato UI specifici della Home (`inputTyped`, `closeUgc`, `closeDownloads`, `setHomeResultTabSelected`), così funziona da qualunque pagina e non solo da dove la mappa è già visibile.

## Trappole

Vivono in [.claude/rules/box-e-immagini.md](../../.claude/rules/box-e-immagini.md), dove si
caricano toccando `box/`, `home/home-layer/` o `shared/img/`: l'overlay inerte senza un genitore
`display:grid`, i `min-*` di `wm-img` che vincono sulla cascata, le classi icona che non esistono
nell'icon font, e gli override di tema che si rompono cambiando la tecnica di stacking. Qui resta
il perché di ciascuna.


## Bug risolti di rimbalzo e debito noto

- **`display:block` mancante su `.wm-img-image`** (oc:8164): lasciava un phantom gap bianco sotto ogni immagine — lo spazio da baseline dell'inline formatting context, comportamento di default di un `<img>`. Presente probabilmente ovunque `wm-img` sia usato, mai notato perché mascherato da overlay scuri. Fix minimo, nessun effetto comportamentale.
- **`geohub/75.css` non è stato toccato** (oc:8305): la sua `line-height:initial !important` su `.wm-box-title` altera il budget "3 righe ≈ 117px" calcolato per il default. Non verificato col font reale di geohub — rischio basso, segnalato.
- **Nessuna gestione dell'errore di caricamento immagine** (oc:8164): `wm-img` non espone un evento `(error)` nella sua pipeline asincrona, e aggiungerlo avrebbe richiesto di toccare un componente usato ovunque. Un URL presente ma non risolvibile (media cancellato) non ha mitigazione.
- **Nessun test unitario su `layer-box`/`home-layer`** (oc:8164), coerente con l'assenza di spec preesistenti su entrambi. C'è solo un test isolato sulla pipe pura `hasLogo`.
- **Separatore logo/titolo ad altezza fissa in `home-layer.component.camminiditalia.scss:70-88`** (oc:8589): un offset `top`/`bottom` simmetrico su un contenitore ad altezza automatica eredita la variabilità di quel contenitore — i numeri e la soglia scelta sono nel commento inline del file. Stessa lezione generale di questa pagina: un separatore/overlay basato su offset relativi a un'altezza variabile eredita quella variabilità; l'altezza fissa e centrata è il pattern robusto.
