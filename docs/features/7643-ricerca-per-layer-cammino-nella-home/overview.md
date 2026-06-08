> Ticket: oc:7643

# Ricerca per layer/cammino nella home

## Cosa cambia

Nella vista risultati di ricerca viene aggiunto un tab **"Cammini N"** condizionale, posizionato prima del tab "Sentieri". Il tab mostra i layer filtrati per nome in tempo reale — puramente client-side sui layer già disponibili dalla configurazione app al boot (nessuna chiamata Elastic). Appare solo quando ci sono match; quando non ce ne sono il tab sparisce e l'esperienza è identica a quella attuale.

## Perché

Gli utenti non riescono a trovare rapidamente un cammino specifico perché la home non scala con molti layer. Chi cerca "Cammino di Dante" è costretto a scorrere tutta la lista manualmente. La funzionalità è segnalata frequentemente come fonte di frustrazione.

## Requisiti

- [ ] Il tab "Cammini N" è il primo tab nella barra `ion-segment` della vista risultati
- [ ] Il tab è visibile **solo** se il filtro produce almeno un match (condizionale `*ngIf`)
- [ ] Il filtro è client-side sui layer già in memoria dalla configurazione app (`confMAPLAYERS` selector) — nessuna chiamata Elastic, i layer sono disponibili dal boot
- [ ] La normalizzazione del filtro usa lowercase + strip accenti + match "contains" sul campo `title` di `ILAYER`
- [ ] Il contatore dinamico nel label ("Cammini N") si aggiorna live al variare dell'input (`inputTyped` selector)
- [ ] Click su un box cammino emette `@Output() layerEVT` — il `home.component` intercetta e chiama `setLayer()`
- [ ] Il box cammino riusa `wm-layer-box` già esistente (zero markup nuovo)
- [ ] Il tipo `HomeResultTab` in `wm-types` viene esteso con il valore `'layers'`
- [ ] La logica tab attivo: se ci sono layer matches → tab "layers" attivo di default **solo se nessun tab è già selezionato dall'utente**; se l'utente sta già guardando "tracks" o "pois", il tab "Cammini" appare ma non ruba il focus; quando i match spariscono → il tab viene rimosso e il default torna "tracks"
- [ ] La chiave i18n `'layers'` viene aggiunta in tutti e 7 i file di lingua (`it`, `en`, `de`, `es`, `fr`, `pr`, `sq`) — in italiano `'Cammini'`, le altre lingue le completa il traduttore
- [ ] [UX] Il contatore dinamico usa `aria-live="polite"` per annunciare i cambiamenti ai screen reader
- [ ] [UX] Il tab "Cammini" ha `aria-label` descrittivo (es. "Cammini, N risultati")
- [ ] [UX] Il filtro client-side è debounced a **300ms** per evitare re-render ad ogni keystroke (coerente con il debounce Elastic sui sentieri)

## Rischi

- **[UX] Cambio tab automatico aggressivo** — Se l'utente cancella velocemente il testo, il tab "Cammini" sparisce e il tab attivo potrebbe saltare in modo brusco. Mitigazione: la logica di selezione tab attivo deve gestire gracefully la transizione (se il tab attivo sparisce, si torna a "Sentieri" senza side effect visivi).
- **[UX] CLS (Cumulative Layout Shift)** — La comparsa/scomparsa condizionale del tab può causare layout shift visibile. Mitigazione: verificare che `ion-segment` mantenga altezza stabile; eventuale animazione di entrata con `transform/opacity`.
- **`HomeResultTab` type extension** — Il tipo vive in `wm-types` (submodule separato). Va aggiornato lì e il bump di versione va coordinato con wm-core. Mitigazione: aggiornare prima wm-types, poi wm-core.
- **Layer senza titolo** — Alcuni layer potrebbero avere `title` null/undefined. Mitigazione: il filtro skippa i layer con titolo assente.
- **[UX] Immagini layer nel tab risultati** — `wm-layer-box` mostra `feature_image`. Verificare che il parametro `size="225x100"` sia mantenuto nel riuso per evitare il caricamento di immagini full-size.

## Out of scope

- Modifiche alla ricerca Elastic sui sentieri
- Ordinamento risultati nel tab cammini
- Pagination nel tab cammini
- Ricerca fuzzy (solo contains normalizzato)
- Modifiche al box cammino (riuso as-is)

## Moduli toccati

**Repo: `wm-types`** (submodule `src/app/shared/wm-types`)
- `src/user-activity.ts` — aggiunta valore `'layers'` al tipo `HomeResultTab`

**Repo: `wm-core`** (submodule `src/app/shared/wm-core`)
- `projects/wm-core/src/home/home-result/home-result.component.ts` — logica filtro layer + `layerEVT` output + `showResultTabSelected$` aggiornato
- `projects/wm-core/src/home/home-result/home-result.component.html` — tab "Cammini" condizionale + loop `wm-layer-box`
- `projects/wm-core/src/home/home-result/home-result.component.scss` — eventuali stili tab (minimo)
- `projects/wm-core/src/localization/i18n/it.ts` (+ altri 6 file lingua) — chiave `'layers'` → `'Cammini'` (it), placeholder per altre lingue

**Repo: `wm-webapp`** (repo principale)
- `src/app/shared/wm-core/` — bump ref submodule wm-core
- `src/app/shared/wm-types/` — bump ref submodule wm-types
- `src/app/shared/wm-core/projects/wm-core/src/home/home.component.html` — binding `(layerEVT)="setLayer($event)"`
