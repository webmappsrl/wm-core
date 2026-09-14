# wm-core — CLAUDE.md

## Cos'è questo repo

Libreria Angular condivisa (`wm-core`, v2.0.0), montata come **submodule Git** da due prodotti
diversi: `wm-webapp` (sotto `src/app/shared/wm-core`) e `webmapp-app` (sotto
`core/src/app/shared/wm-core`). Distribuisce componenti, servizi e store NgRx usati da entrambi.

Stack: Angular 20, Ionic 8, NgRx 20, OpenLayers 7. Accanto vivono altri due submodule condivisi
dagli stessi consumer, `map-core` (mappa e direttive OpenLayers) e `wm-types` (tipi condivisi).

Qui vive il **dominio**: come funziona un meccanismo e quali vincoli valgono per chiunque lo
monti. Ciò che vale per un prodotto solo — pagine, temi di shard, configurazioni di build — resta
nel repo di quel prodotto.

## Regole del repo

- **I test E2E non vivono qui.** Cypress sta nei prodotti che montano questa libreria — in
  `wm-webapp` sotto `cypress/`, nell'app sotto `core/cypress/` — e lì vivono anche le regole su
  come si scrivono. Qui resta la procedura, perché il dominio che quei test esercitano è questo:
  [docs/howto/test-e2e-cypress.md](docs/howto/test-e2e-cypress.md).
- **Una modifica qui arriva a entrambi i prodotti.** Prima di cambiare un componente condiviso,
  considera che i consumer hanno temi e varianti propri che questo repo non vede.

## Comandi

| Cosa | Comando |
|---|---|
| Test unitari | `npm run test` |
| Test in watch | `npm run test:watch` |
| Test single-run (CI) | `npm run test:single` |
| Documentazione (Compodoc) | `npm run compodoc` |
| Test E2E | **non si lanciano da qui**: Cypress vive nel consumer, in `wm-webapp` con `npm run e2e` (o `cy:open` per la GUI) |

## Convenzioni

- **Gli ID dei ticket hanno la forma `oc:<numero>`** e vengono da Orchestrator.
- **Ogni documento sotto `docs/features/` inizia con `> Ticket: oc:<ID>`**, e lo slug della
  cartella è `<ID>-<titolo-in-kebab-case>`.
- **Lo scope dei commit porta il ticket**: `feat(oc:<ID>): …`, `fix(oc:<ID>): …`,
  `refactor(oc:<ID>): …`.
- **`docs/` ha tre destinazioni, e rispondono a domande diverse**: `features/` è il cantiere di un
  lavoro (com'è andato, immutabile), `knowledge/` la conoscenza per argomento (perché funziona
  così, per chi deve cambiarlo), `howto/` le procedure (come si fa). Le trappole non stanno in
  nessuna delle tre: stanno in `.claude/rules/`.
- **Documentazione, commenti e messaggi di commit sono in italiano.** I termini tecnici restano in
  inglese: commit, branch, merge, build, deploy, review.

## Conoscenza

Il dettaglio di ogni lavoro sta nel proprio cantiere sotto `docs/features/<slug>/`. Qui c'è solo l'indice per argomento.

| Argomento | Cosa copre | Ticket | Pagina |
|---|---|---|---|
| Aggiornamenti dell'app | Controllo versione al ritorno in foreground, listener Capacitor nel service | oc:8174 | [docs/knowledge/aggiornamenti-app.md](docs/knowledge/aggiornamenti-app.md) |
| Ambiente e hostname | Riconoscimento dello shard dall'hostname, domini di anteprima a N parti | oc:8031 | [docs/knowledge/ambiente-e-hostname.md](docs/knowledge/ambiente-e-hostname.md) |
| Box informativi configurabili | Accordion custom `wm-config-detail`, apertura multipla, meccanismo di assestamento rimosso | oc:8181, oc:8458, oc:8427 | [docs/knowledge/config-detail.md](docs/knowledge/config-detail.md) |
| Cache delle API e log in produzione | Header condizionale in `handleApiCache`, triage dei `console.*` | oc:8374, oc:8369 | [docs/knowledge/cache-e-log.md](docs/knowledge/cache-e-log.md) |
| Deep link | Perché il percorso nativo è stato scartato, ordine in `initialize()`, navigazione Home→Map | oc:8470, oc:7980 | [docs/knowledge/deep-link.md](docs/knowledge/deep-link.md) |
| Filtro dei POI | Due stage tassonomia + layer ID, retrocompatibilità legacy, binding multi-direttiva | oc:8147, oc:7646 | [docs/knowledge/filtri-poi.md](docs/knowledge/filtri-poi.md) |
| Home: tab, conteggi ed etichette | Scelta del tab risultati, badge non filtrato, chiavi i18n condivise badge/segment | oc:7643, oc:8221 | [docs/knowledge/home-ricerca-e-tab.md](docs/knowledge/home-ricerca-e-tab.md) |
| Isolamento del TestBed | Reset fra spec file, campi `static`, config Karma del progetto | oc:7989 | [docs/knowledge/testbed-isolamento.md](docs/knowledge/testbed-isolamento.md) |
| `layer-box` e `home-layer` | Overlay su CSS Grid, logo dentro `wm-img`, cuoricino preferiti | oc:8305, oc:8176, oc:8164 | [docs/knowledge/layer-box-e-home-layer.md](docs/knowledge/layer-box-e-home-layer.md) |
| PostHog | `PosthogContextService`, contesto degli eventi, `user_id` e `userMoved` | oc:8115, oc:8127, oc:8159 | [docs/knowledge/posthog.md](docs/knowledge/posthog.md) |
| Profilo altimetrico e distanza | Badge live distance, proiezione GPS→traccia, etichetta dislivello sugli anelli | oc:8177, oc:8493, oc:8284 | [docs/knowledge/profilo-altimetrico-e-distanza.md](docs/knowledge/profilo-altimetrico-e-distanza.md) |
| Profilo utente | Modale di editing, avatar e fallback a iniziali, compressione parametrizzata | oc:8163 | [docs/knowledge/profilo-utente.md](docs/knowledge/profilo-utente.md) |
| UGC | Pre-selezione del layer da GPS, foto condivise fra POI e track, condivisione social | oc:7639, oc:5125, oc:8183 | [docs/knowledge/ugc.md](docs/knowledge/ugc.md) |
| Varianti per shard | `fileReplacements`, quando estrarre una classe base, filtri della searchbar camminiditalia | oc:8391, oc:8414 | [docs/knowledge/varianti-per-shard.md](docs/knowledge/varianti-per-shard.md) |

## Trappole

Le trappole — ciò che non si deduce leggendo il codice e che si scopre solo sbagliando — stanno
in `.claude/rules/`, un file per soggetto, con il frontmatter `paths:` che le carica quando si
toccano i file corrispondenti: `box-e-immagini`, `spec-e-testbed`, `form-e-cva`,
`varianti-e-classi-base`, `posthog-e-log`, `template-wm-map`. Ogni rule rimanda alla pagina di
conoscenza per il perché.

## Lavori senza una pagina dedicata

Temi toccati una volta sola, il cui dettaglio vive solo nel cantiere.

| Lavoro | Ticket | In breve |
|---|---|---|
| Padding della mappa nel modale UGC | oc:4783 | Binding `[wmMapPadding]` su `<wm-map>`; il fix che lo rende visibile è nel submodule `map-core`. `docs/features/4783-controllare-il-padding-della-mappa/overview.md` |
| Immagine di un layer: formati e zona sicura | oc:8502 | Guida illustrata per il cliente su come preparare l'immagine perché loghi e testo non vengano tagliati, basata sui thumbnail realmente generati su S3. In wm-core `size="225x100"` non cambia l'URL (arriva il 400×200), il secondo ritaglio è solo CSS `cover`. `docs/features/8502-come-impostare-correttamente-limmagine-di-un-layer/` |
| Immagine "i miei percorsi" su native e web | oc:7480 | Su native usa sempre il path locale ignorando l'URL S3: gulp ha già scaricato l'immagine durante il build. `docs/features/7480-inserire-foto/notes.md` |
