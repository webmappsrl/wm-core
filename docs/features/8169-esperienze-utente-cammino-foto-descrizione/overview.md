> Ticket: oc:8169

# Esperienze utente su cammino con foto e descrizione

> Wireframe interattivo (verificato contro l'app reale, loggata): https://claude.ai/code/artifact/24515214-ba97-4f8d-96fd-496b6bee3576
>
> Overview gemella (backend): `camminiditalia/docs/features/8169-esperienze-utente-cammino-foto-descrizione/overview.md`

## Cosa cambia

L'utente loggato può inviare un **feedback** (testo + foto) da due entry point con semantica diversa: dalla schermata del layer (salva `layer_id` → feedback sul cammino) o dalla schermata della traccia (salva `ec_track_id` + `layer_id` → feedback sulla tappa). Il componente si chiama "Feedback" in wm-core (generico, abilitato dalla presenza del form schema `feedback` in configurazione), con label "Esperienza" su Cammini d'Italia. I feedback sono `UgcPoi` con `form.id = 'feedback'`, sincronizzati via infrastruttura UGC esistente.

Graficamente:
- **Schermata Cammino (layer)**: "Esperienze" diventa un terzo `ion-segment-button`, accanto a "Tappe"/"Luoghi" già esistenti (stesso pattern parametrico di `home-result.component.html`) — non un componente nuovo. **Diversamente da Tappe/Luoghi, questo segment-button è sempre visibile quando il form `feedback` è abilitato in config, non condizionato a `count>0`**: a differenza di Tappe/Luoghi (contenuto del layer, quasi sempre non vuoto), le Esperienze partono da 0 per ogni utente — nasconderlo a count 0 impedirebbe di trovare la CTA per creare la prima Esperienza (contraddizione trovata in Fase: challenge).
- **Schermata Tappa (traccia)**: non esiste un segment da estendere (nodo foglia) — "Esperienze" è una nuova sezione flat, posizionata **in fondo, dopo "Descrizione"**.
- **"I miei percorsi" (`ugc-box`)**: stesso `ion-segment` reale "Tappe N | Luoghi N" osservato da loggato, con "Esperienze N" come terzo segment-button.
- **Form di creazione**: riusa la UI reale di `modal-save.component.html` (chrome header/footer) + `wm-image-picker` (foto, max **3**, invariato) — nessun componente nuovo per foto/upload.
- **Visualizzazione contestuale** (layer/traccia): in questo ciclo mostra **solo le esperienze dell'utente loggato**; il selettore/query va scritto parametrico su uno "scope" (mine/all), non con due implementazioni separate, per rendere rapida l'estensione futura a "tutte le esperienze della community".
- **Modifica ed eliminazione** della propria Esperienza già pubblicata sono incluse in questo ciclo (riuso del pattern `deletePoi()` esistente in `ugc-poi-properties.component.ts`).
- Pubblicazione bloccata client-side se sia descrizione che foto sono vuoti.

## Perché

Il cliente vuole raccogliere i racconti dei camminatori come patrimonio della community. Il nome generico "Feedback" permette ad altri shard di riusarlo con label e form diversi. La pubblicazione pubblica è pianificata come sviluppo futuro; la visibilità "solo mie" di questo ciclo è pensata per essere facilmente estesa senza refactor.

## Requisiti

- [ ] Form `feedback` (camminiditalia): schema acquisition form con `description` (textarea, `required:false`, stesso pattern di "report"/"poi"); nessun campo "photos" nello schema — foto gestite fuori-form come per gli altri UGC POI
- [ ] wm-core: componente Feedback abilitato dalla presenza di `form.id = 'feedback'` in configurazione app; label configurabile per shard
- [ ] wm-core: entry point schermata layer — nuovo `ion-segment-button` "Esperienze" **sempre visibile** (non condizionato a `count>0`, a differenza di Tappe/Luoghi) nel segment esistente della schermata Cammino, con CTA "Aggiungi un'esperienza" e lista contestuale (scope "mine" di default)
- [ ] wm-core: entry point schermata traccia — nuova sezione flat "Esperienze" in fondo (dopo "Descrizione"), con CTA e lista contestuale
- [ ] wm-core: form di creazione — riuso di `modal-save`-style chrome + `wm-image-picker` (max 3 foto); nessun pin GPS mostrato all'utente (vedi Rischi per la geometria)
- [ ] wm-core: blocco pubblicazione se descrizione e foto sono entrambe vuote — il check sulla descrizione va fatto su testo con `trim()` applicato, non sulla sola non-vuotezza della stringa grezza (altrimenti una descrizione di soli spazi bianchi supererebbe il controllo)
- [ ] wm-core: store UGC — selettore che filtra `ugcPois` per `form.id = 'feedback'`, escludendoli dai tab "Tappe"/"Luoghi" esistenti; nuovo count per il terzo segment-button
- [ ] wm-core: tab "Esperienze" in "I miei percorsi" (`ugc-box`) come terzo `ion-segment-button`, stesso pattern di Tappe/Luoghi
- [ ] wm-core: modifica ed eliminazione della propria Esperienza (riuso `deletePoi()`/pattern `ugc-poi-properties.component.ts`)
- [ ] wm-core: selettore/query per la visualizzazione contestuale scritto parametrico su scope (mine/all), non due implementazioni separate
- [ ] Design UX/UI con Claude per form, segment Esperienze e sezione flat in tappa — **wireframe già prodotto e approvato**, vedi link in testa

## Rischi

- **`geometry` obbligatoria a DB (`ugc_pois.geometry`, NOT NULL)** — verificato in migration, nessuna colonna nullable. L'Esperienza spesso si scrive **dopo** l'escursione (a casa, in albergo) — la posizione GPS al momento della pubblicazione non rappresenta "dove" è stata vissuta l'esperienza, solo dove si trovava il telefono mentre si scriveva. Decisione presa in Fase: challenge: si continua a catturare il GPS reale (stesso meccanismo di report/poi, nessun pin mostrato), ma questo dato **non deve mai essere esposto in nessuna vista mappa/pubblica, nemmeno quando si attiverà la visibilità community** — va trattato come metadato tecnico interno, solo per soddisfare il vincolo NOT NULL. Qualsiasi lavoro futuro sulla "pubblicazione pubblica" (out of scope qui) deve rivalutare questo vincolo prima di mostrare le Esperienze su una mappa. Rischio UX residuo: permesso di geolocalizzazione negato/non disponibile blocca la pubblicazione — scenario più probabile qui che per report/poi, dato che l'uso tipico (scrivere dopo, non sul posto) rende più facile trovarsi senza fix GPS attivo; non affrontato esplicitamente nel ticket originale, accettato come rischio noto.
- **Sync UGC invariata** — i feedback sono `UgcPoi` normali, la sync esistente li gestisce già; il rischio è che appaiano dove non devono → mitigato filtrando per `form.id` nei selettori (ex novo, non esiste oggi alcun filtro per `form.id` in `ugc.selector.ts`).
- **`form.id = 'feedback'` come convenzione** — va documentato in wm-core per evitare collisioni tra shard.
- **Asimmetria di design layer/traccia** — la sezione Esperienze usa due pattern UI diversi (segment vs sezione flat) per una ragione strutturale reale (la traccia non ha figli da segmentare), non per incoerenza; da comunicare chiaramente in review per non farla leggere come un'inconsistenza.
- **Debito tecnico noto, non risolto in questo ciclo** (accettato in Fase: challenge): filtro `FormSchemaFilter` (Nova, wm-package) deriva le opzioni dalla *label* del form, non dall'id — un Administrator che vede più app rischia, in caso di collisione di label tra app diverse, un filtro che punta al `form.id` sbagliato senza errore visibile. Rischio a bassa probabilità, non introdotto da questo ticket.
- **Debito tecnico noto, non risolto in questo ciclo**: un'Esperienza senza `layer_id` risolvibile (traccia orfana, layer cancellato) resta visibile solo all'Administrator, in un limbo silenzioso — comportamento invariato rispetto a `report` oggi, non peggiorato da questo ticket.

## Out of scope

- Pubblicazione/visibilità pubblica nell'app per utenti non loggati o al di fuori del contesto community (ticket futuro)
- Moderazione/approvazione da parte del gestore
- Notifica email ai gestori del layer alla creazione di un'Esperienza (verificato: `UgcObserver::created()` filtra esplicitamente `formId !== 'report'`, quindi un'Esperienza non la triggera — comportamento corretto, nessuna modifica necessaria)

## Moduli toccati

**wm-core:**
- `store/features/ugc/ugc.selector.ts` (nuovo filtro per `form.id`, nuovo count, selettore scope mine/all)
- Nuovo componente Feedback (form + entry point), riuso `modal-save`-style chrome + `wm-image-picker`
- `home/home-result/home-result.component.html`/`.ts` (o equivalente) — nuovo `ion-segment-button` "Esperienze" sempre visibile (non condizionato al count)
- `box/ugc-box/` — nuovo `ion-segment-button` "Esperienze" nella lista "I miei percorsi"
- Schermata layer (segment) + schermata traccia (sezione flat in fondo) — entry point e visualizzazione contestuale
- Riuso `deletePoi()`/pattern `ugc-poi-properties.component.ts` per modifica/eliminazione
