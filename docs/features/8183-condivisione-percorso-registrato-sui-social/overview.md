> Ticket: oc:8183

# Condivisione percorso registrato sui social (stile Strava) — pulsante e stato UI (wm-core)

## Cosa cambia
- Nuovo pulsante "Condividi" in `ugc-track-properties.component.html`/`.ts`, visibile solo se il flag conf `ugc_track_share_enabled` è `true` (opzionabile per shard, pattern già in uso per altri flag come `showTrackRemainingDistance`).
- Al tap, il componente emette un evento verso il livello superiore (repo principale, che orchestra: richiesta screenshot al componente mini-map di map-core → invocazione plugin nativo Stories — vedi overview del repo principale) — `ugc-track-properties` non ha e non deve avere accesso diretto né alla mappa né al plugin nativo/servizio share.
- Stati UI: idle → generating (mentre map-core produce lo screenshot on-device e il plugin nativo viene invocato) → success (share sheet Stories si apre) → error (messaggio chiaro + retry esplicito).
- **Nessuna azione di revoca**: a differenza di una prima ipotesi valutata (link pubblico persistente), lo share è verso le Stories (contenuto effimero, nessun artefatto pubblico sotto il nostro controllo) — non c'è stato di condivisione da attivare/disattivare, ogni tap è un'azione autonoma e stateless.
- `wm-types`: nuovo campo booleano nell'interfaccia `OPTIONS` per il flag conf (`ugcTrackShareEnabled` o nome equivalente) — modifica minima, senza decisioni di design autonome, per questo non ha un overview.md dedicato in wm-types.
- **Punto di ingresso disponibile sia subito dopo la registrazione sia in un secondo momento** (chiarito in Fase: challenge): `ugc-track-properties` è montato solo da `map.page.html`, agganciato al parametro URL `ugc_track` — è un pannello generico riusato ogni volta che una traccia UGC viene aperta sulla mappa (anche riaprendola dalla lista "le mie tracce" in un momento successivo alla registrazione), non un componente esclusivo del flusso immediato. Se l'utente è offline al momento della registrazione, può ritentare più tardi riaprendo la stessa traccia, senza bisogno di una coda/retry differito dedicato.

## Perché
Vedi overview del repo principale (`webmapp-app/docs/features/8183-.../overview.md`) per il contesto completo. Questo file copre solo la superficie UI in wm-core: il pannello proprietà traccia è il punto di ingresso dell'azione utente.

## Requisiti
- [ ] Pulsante "Condividi" in `ugc-track-properties`, gated da flag conf `ugc_track_share_enabled`
- [ ] Stati UI: idle → generating → success/error, con retry esplicito su errore
- [ ] Nuovo campo booleano in `OPTIONS` (wm-types) per il flag conf
- [ ] Traduzioni it/en/es/de/fr/pr/sq per tutti i testi nuovi (bottone, stati, errori) — italiano lingua principale, coerente con le chiavi i18n già in uso nel componente

## Rischi
- `ugc-track-properties` è un componente "foglio" annidato senza accesso all'istanza mappa o a servizi nativi — il canale di comunicazione verso il repo principale (Output event vs dispatch NgRx) va scelto in `plan.md` in coerenza con i pattern già esistenti nel componente (oggi usa `@Output('dismiss')`/`@Output('poi-click')` per bubbling verso l'alto, non NgRx diretto per queste interazioni UI).
- **Aggiornato (terza revisione)**: il backend ora genera lui stesso mappa+statistiche+immagine (vedi overview repo principale e wm-package) — un'unica chiamata di rete invece di screenshot locale+rete+plugin nativo. La latenza percepita resta (il backend deve fare più lavoro in un colpo solo: calcolo statistiche, rendering mappa, compositing, persistenza), ma il rischio di stati intermedi incoerenti è minore avendo un solo round-trip da gestire.

## Out of scope
- Logica di generazione mappa/statistiche/immagine (interamente lato backend, wm-package) — questo file copre solo pulsante e stato UI
- Qualsiasi stato di condivisione revocabile — la pagina pubblica generata dal backend vive finché esiste la traccia (404 se eliminata), ma non c'è un concetto di "disattiva condivisione" separato in questo ciclo

## Moduli toccati
- `wm-core/projects/wm-core/src/ugc-track-properties/ugc-track-properties.component.ts`
- `wm-core/projects/wm-core/src/ugc-track-properties/ugc-track-properties.component.html`
- `wm-core/projects/wm-core/src/ugc-track-properties/ugc-track-properties.component.scss`
- `wm-core/projects/wm-core/src/localization/i18n/*.ts` (it, en, es, de, fr, pr, sq)
- `wm-types` — interfaccia `OPTIONS` (nuovo campo booleano, modifica minima non documentata separatamente)
- eventuali store actions/selectors se il flusso passa da NgRx invece che Output diretto (da definire in `plan.md`)
