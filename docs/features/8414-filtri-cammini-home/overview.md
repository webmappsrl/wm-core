> Ticket: oc:8414

# Filtri sui cammini in Home — componente frontend

## Cosa cambia
In Home viene introdotto un nuovo componente "Cerca il tuo cammino": la search box testuale già esistente (riusata, non riscritta) più un toggle che apre un pannello di 7 filtri (Lunghezza, Tappe, Tipologia, Portata, Regioni, Temi, Stagioni), ciascuno un accordion inline con icona+etichetta+chevron, e una CTA finale **"Andiamo!"** (il testo del ticket la chiama erroneamente "Tutti i risultati" — il nome reale, confermato dalle schermate mobile del sito camminiditalia.org, è "Andiamo!"). Al variare della selezione, la lista dei cammini mostrata nei box `wm-layer-box` di `wm-home-landing` si aggiorna subito, client-side, senza navigazione né nuove chiamate backend.

`ILAYER` (`types/config.ts`) viene esteso con `attributes?: LayerAttributes` (tipo da `@wm-types/config`, vedi overview gemella in `wm-types`).

Il componente è **generico**, non shard-specific: si nasconde automaticamente quando nessun layer in `MAP.layers` ha `attributes` popolato — nessun `fileReplacements` dedicato in `webmapp-app/core/angular.json` (decisione presa in reverse-interaction: oggi solo camminiditalia ha questi dati, ma altri shard potranno usarlo senza nuovo codice quando li avranno).

## Perché
Richiesta cliente (customer_request, ticket oc:8414): poter cercare il cammino adatto in Home tramite nome + filtri (lunghezza, durata, tipologia, portata, regioni, temi, stagioni), con la lista che si aggiorna subito senza cambiare pagina — stessa UX già presente sul sito camminiditalia.org.

## Requisiti
- [ ] Componente visibile solo se almeno un layer in `MAP.layers` ha `attributes` non-`null`/non-`undefined` (gating sui dati, nessun flag `OPTIONS` dedicato — verificato: non esiste nel backend, vedi `notes.md`)
- [ ] Search box esistente integrata visivamente nel nuovo componente (stessa logica di ricerca già in uso, non riscritta)
- [ ] Toggle (icona a cursori) che apre/chiude il pannello dei 7 filtri
- [ ] 7 filtri come righe verticali full-width (icona+etichetta+chevron): **Lunghezza** (`distance`), **Tappe** (`stage_count` — etichetta "Tappe", non "Durata", confermata in reverse-interaction), **Tipologia** (`shape`, solo opzioni `roundtrip`/`linear`), **Portata** (`walking_network`), **Regioni** (`taxonomy_where`), **Temi** (`themes`), **Stagioni** (`season`)
- [ ] Ogni riga filtro è un accordion inline (apertura singola alla volta, evidenziazione bordo attivo), con bottone "Fatto" per confermare/chiudere la selezione
- [ ] Lunghezza e Tappe: bucket a **soglie fisse hardcoded**, fedeli a camminiditalia.org (es. per Tappe: "0-5 tappe", "5-10 tappe", "10-20 tappe", ">20 tappe"); un bucket senza risultati resta visibile con count 0 / disabilitato, mai nascosto
- [ ] Tipologia, Portata, Regioni, Temi, Stagioni: opzioni multi-select derivate **dinamicamente** dai valori realmente presenti in `MAP.layers[*].attributes` (mai lista statica), ordinate alfabeticamente secondo la lingua attiva
- [ ] `shape: "discontinuous"` **mai** offerto come opzione Tipologia; i cammini che lo hanno restano comunque visibili quando quel filtro non è attivo
- [ ] CTA "Andiamo!": applica i filtri correnti e porta l'utente alla lista completa dei risultati corrispondenti (non li azzera)
- [ ] Semantica filtro: **AND** tra dropdown diversi, **OR** dentro lo stesso dropdown, search box in AND con i dropdown; attributo assente sul layer = escluso solo se quel filtro è attivo; nessun filtro attivo = tutti i cammini
- [ ] Icone dei 7 filtri: nuovi SVG inline, ricreati ispirandosi visivamente alle icone del sito (percentuale, calendario, freccia circolare, globo, pin, bacchetta, sole), coerenti in stile con l'icon font esistente (`core/src/assets/icons/webmapp-icons`, repo principale)
- [ ] Traduzioni: catena `lingua attiva → it → en → prima disponibile` per le etichette valore (fornite dal backend); testi UI statici (etichette filtri, "Fatto", "Andiamo!") con testo di default in italiano, tradotti in tutte le lingue esistenti (`it`, `en`, `fr`, `de`, `es`, `pr`, `sq`)
- [ ] Opzioni e range derivati una sola volta dal config e memorizzati (selector NgRx o `computed`), non ricalcolati ad ogni interazione utente
- [ ] Nessuna modifica al drawer filtri mappa esistente (`FiltersComponent`, `wm-select-filter`, `wm-slider-filter`) — componente nuovo e disaccoppiato, anche se ne riprende il pattern di interazione ad accordion
- [ ] Bottone **"Azzera filtri"** accanto a "Andiamo!" (confermato da screenshot mobile del sito), visibile quando almeno un filtro è attivo
- [ ] Bucket numerici (Lunghezza/Tappe): confine incluso nel bucket **superiore** — un valore esattamente al limite (es. 5 tappe) cade in "5-10", non in "0-5"
- [ ] Regioni: un cammino che attraversa più regioni compare in tutti i bucket regione pertinenti (coerente con la semantica OR già definita)
- [ ] Quando un layer/cammino è selezionato (aperto in dettaglio), il pannello dei 7 filtri si nasconde (non ha senso filtrare Regioni/Tipologia su un singolo cammino già aperto) — resta solo la search box, che già oggi (comportamento esistente, non nuovo) scopa la ricerca alle sole tappe di quel layer
- [ ] Evento PostHog `filterUsed` (o nome analogo) alla selezione di un valore filtro, con `filter_type`/`filter_id` — stesso pattern già in uso in `wm-select-filter`/`wm-slider-filter` del drawer mappa
- [ ] Accessibilità: `aria-expanded`/`aria-controls` sull'header di ogni riga filtro accordion, gestione focus alla apertura/chiusura — stesso standard già stabilito da `wm-config-detail` (oc:8181) in questo repo
- [ ] Test E2E Cypress con fixture (`cy.intercept()`, mai API reali) per la logica di filtro — pattern obbligatorio per feature UI di wm-core, documentato nel CLAUDE.md di questo repo

## Rischi
- **Dipendenza esterna, ora risolta in locale**: il backend oc:8180 non era mai stato mergiato su `main` (root cause trovata durante la pianificazione) — in produzione **0 layer su 118** avevano `attributes` popolato. In locale la causa reale era diversa: codice e job erano a posto (branch corretto, `RecalculateLayerAttributesJob`/`UpdateAppConfigJob` eseguiti), ma `AppConfigService` legge il config.json da uno storage disk (MinIO `wmfe`) diverso da quello effettivamente rigenerato in alcune run precedenti — risolto rilanciando manualmente `writeAppConfigOnAws()` per l'app (117/118 layer ora popolati anche sull'endpoint locale). **Produzione resta non risolta**: serve ancora merge + deploy + azione Nova di backfill, fuori dal controllo di questo repo/ticket. Vedi `notes.md` per il dettaglio completo.
- **Componente "generico gated su dati" invece di variante shard-specific**: se un altro shard avesse in futuro `attributes` popolati per motivi diversi (es. test, dati parziali), il componente comparirebbe con copy/icone pensate specificamente per camminiditalia (es. CTA "Andiamo!", icone ispirate al sito) senza conferma del cliente di quello shard. **Nessun kill-switch aggiuntivo** (es. `OPTIONS.showRouteFilters`) è stato introdotto — a differenza di feature comparabili nel repo (oc:8183, oc:8177) che hanno un flag di disattivazione indipendente dai dati. Rischio esplicitamente ri-confermato come accettato dopo la review adversariale (Fase: challenge) — nessuna mitigazione ulteriore in questo ciclo.
- **Nessuna validazione runtime del contratto dati** (`ILAYER.attributes`): TypeScript non protegge da un mismatch tra la shape attesa (`LayerAttributes`, wm-types) e quella realmente inviata dal backend — un rename di chiave o un valore enum imprevisto non produce errore, solo un filtro silenziosamente incompleto. Verificato durante la pianificazione che la shape reale (dati locali post-fix) corrisponde a quanto documentato nel ticket (`distance`/`stage_count` numeri grezzi, `shape`/`taxonomy_where` wrappati in `{value, name}`), ma nessuna validazione automatica (es. zod/io-ts) è prevista per il futuro — rischio accettato, coerente con l'assenza di validazione runtime altrove in questa codebase per i dati di config.json.
- **`confHOME` non gestisce layer non trovato** (bug preesistente, non introdotto da questa feature): un box Home che punta a un id layer inesistente produce `layer: undefined` — va coperto in fase di test per non far fallire il rendering del nuovo componente.
- **Integrazione con la search box esistente**: `wm-searchbar` oggi filtra solo su `title` (non `description`, nonostante il ticket parli di "titolo/descrizione"); il posizionamento visivo nella card del nuovo componente (vedi screenshot mobile del sito) richiede coordinamento col componente esistente in `home.component.html` — dettaglio implementativo da risolvere in `plan.md`, non un rischio di prodotto.

## Out of scope
- Modifiche al backend (contratto chiuso, oc:8180).
- Applicazione degli stessi filtri alle singole tracce (le primitive esistono lato backend, il consumo no).
- Soglia percentuale di copertura per il filtro Regioni (si prendono tutte le regioni intersecate dal percorso).
- Modifiche al drawer filtri mappa esistente (`FiltersComponent`).

## Moduli toccati
- `projects/wm-core/src/types/config.ts` — `ILAYER.attributes?: LayerAttributes`
- `projects/wm-core/src/home/` — nuovo componente filtri (nome definitivo in `plan.md`)
- `projects/wm-core/src/home/home.component.html` — wiring del nuovo componente, coordinamento con `wm-searchbar` esistente
- `projects/wm-core/src/home/home-result/home-result.component.ts` — eventuale estensione della ricerca testuale (da verificare in `plan.md` se in scope)
- `projects/wm-core/src/localization/i18n/{it,en,de,es,fr,pr,sq}.ts` — nuove chiavi i18n
