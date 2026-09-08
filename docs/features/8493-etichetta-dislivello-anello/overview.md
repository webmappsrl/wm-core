> Ticket: oc:8493

# Etichetta dislivello su percorsi ad anello

## Cosa cambia

Nel pannello di dettaglio traccia (`wm-tab-detail`), quando la traccia è un percorso ad anello (`properties.roundtrip === true`), la riga del dislivello mostra l'etichetta generica **"Dislivello"** (chiave i18n `slope`) invece di **"Dislivello positivo"** (chiave `ascent`). Il comportamento per le tracce non ad anello resta invariato (mostra sia `ascent` che `descent` come oggi).

## Perché

Un cliente (CAI Parma) ha segnalato che sulla pagina dell'anello "Palanzano Grande Faggio" (sentieri.caiparma.it) manca il dislivello in discesa, mostrando solo "Dislivello positivo". In realtà, su un percorso ad anello il dislivello positivo è per definizione pari (o equivalente) al negativo — la UI non mostra mai la riga "descent" per i roundtrip (`*ngIf="!properties?.roundtrip && ..."`, comportamento preesistente e non modificato da questo fix). Il problema reale non era un dato mancante, ma un'etichetta fuorviante: "Dislivello positivo" lascia intendere che esista un "negativo" separato non mostrato. La nuova etichetta generica "Dislivello" comunica che il valore vale in entrambe le direzioni, senza duplicare il dato.

## Requisiti

- [x] Su un percorso con `properties.roundtrip === true`, la riga dislivello mostra la chiave i18n `slope` invece di `ascent`
- [x] Su un percorso non ad anello, il comportamento resta invariato (`ascent` + `descent` separati, come oggi)
- [x] Nuova chiave i18n `slope` aggiunta in tutte le lingue supportate (it/en/de/es/fr/pr/sq), coerente con la lingua di default del repo (italiano) e con le traduzioni già presenti per `ascent`/`descent`

## Rischi

- **Nessun cambio di dato, solo di etichetta**: il valore numerico mostrato resta `properties.ascent` (nessuna modifica al calcolo o alla sorgente dato) — rischio di regressione sul dato stesso nullo.
- **Comportamento condiviso da tutti gli shard**: `showAscent`/`showDescent` sono opzioni globali (default `true` in `conf.reducer.ts`), nessun gate specifico per `cai_parma`/`carg` — verificato che nessuno shard ha una personalizzazione che dipenda dall'etichetta "Dislivello positivo" testuale.
- **`ugc-track-data.component.html`** (tracce UGC registrate via GPS dall'utente) mostra sempre "ascent" incondizionatamente, senza gestione `roundtrip` — esplicitamente non toccato da questo fix (vedi Out of scope).
- **Collisione i18n trovata in Challenge e corretta**: la prima versione della chiave `slope` era stata tradotta copiando la parola già usata per `pendenza` (gradiente % istantaneo nel grafico altimetrico) in 5 lingue su 7 (en/de/es/fr/sq → stesso identico testo di `pendenza`), reintroducendo in altra forma la stessa ambiguità che il ticket voleva risolvere. Corretto allineando `slope` alla radice già usata da `ascent`/`descent` in ciascuna lingua invece che a `pendenza`: it (`Dislivello`, invariato) ed en (`Slope`, invariato — coerente con `ascent`="Slope +"/`descent`="Slope -" già esistenti) restano come previsto; de→`Höhenunterschied`, es→`Desnivel`, fr→`Dénivelé`, pr→`Elevação`, sq→`Lartësia`.
- **Debito noto, non affrontato in questo ciclo**: in inglese `pendenza` e `ascent`/`descent` condividevano già la parola "Slope" prima di questo fix (`ascent`="Slope +") — preesistente, non introdotto né aggravato da questo ticket.
- **Invariante `ascent≈descent` sui roundtrip non validata a runtime**: se un layer è marcato `roundtrip:true` per errore editoriale (percorso non realmente chiuso), l'etichetta generica "Dislivello" implica erroneamente equivalenza mentre il valore mostrato resta solo `properties.ascent` — nessuna guardia automatica lato frontend, il dato di partenza (flag `roundtrip`) è responsabilità del backoffice/editor. Rischio accettato: proporzionato alla portata di un fix di sola etichetta, non introdotto da questo cambiamento (il flag `roundtrip` esiste ed è usato altrove indipendentemente da questo fix).

## Out of scope

- Nessuna modifica a `ugc-track-data.component.html` (contesto diverso: tracce UGC registrate dall'utente via GPS, non layer editoriali) — il ticket riguarda solo la visualizzazione di un layer/traccia editoriale (`wm-tab-detail`).
- Nessuna modifica al calcolo di `ascent`/`descent` lato backend o al modello dati — è un fix di sola presentazione (etichetta).

## Moduli toccati

**Repo:** `wm-core` (submodule)

- `projects/wm-core/src/tab-detail/tab-detail.component.html` — label condizionale `slope`/`ascent` in base a `properties.roundtrip`
- `projects/wm-core/src/localization/i18n/{it,en,de,es,fr,pr,sq}.ts` — nuova chiave `slope`
