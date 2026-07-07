> Ticket: oc:8221

# Correggere le etichette "Percorso/Percorsi" e "Punti di interesse" nell'app Forestas

## Cosa cambia

- Il badge contatore (`wm-layer-features-counter-badge`) e il tab segment (`wm-home-result`) oggi usano **due chiavi i18n diverse** per lo stesso concetto: il badge mostra `'Percorso'/'Percorsi'` e `'Luogo'/'Luoghi'`, mentre il segment mostra `'Sentieri'` e `'Punti di interesse'`. Questo obbliga a modificare due traduzioni separate per cambiare un'unica etichetta concettuale, ed è la causa strutturale del disallineamento segnalato dal ticket.
- Il badge viene aggiornato per usare le stesse chiavi già presenti nel segment: `'Sentiero'/'Sentieri'` per i percorsi e `'Punto di interesse'/'Punti di interesse'` per i POI. Da questo momento **una sola traduzione** controlla entrambe le UI.
- Viene aggiunta la chiave i18n singolare `'Sentiero'` (mancante oggi in tutte le lingue) e la chiave singolare `'Punto di interesse'` (mancante oggi in tutte le lingue), in tutti e 7 i file di lingua (`it`, `en`, `de`, `es`, `fr`, `pr`, `sq`).
- Il valore di default (in tutte le lingue) della chiave `'Punti di interesse'` (e della nuova `'Punto di interesse'`) viene accorciato a **"POI"**, invariante tra singolare e plurale, per motivi di spazio in UI. Questo è un cambio di **default globale**, applicato a tutte le istanze che usano wm-core (non solo Forestas).
- Il valore della chiave `'Sentieri'` resta quello già esistente e corretto in ogni lingua; viene solo aggiunta la forma singolare mancante `'Sentiero'`.
- Le chiavi `'Percorso'/'Percorsi'` e `'Luogo'/'Luoghi'` **non vengono rimosse**: restano nei file di traduzione come chiavi orfane (non più referenziate da nessun componente dopo la migrazione del badge), per non rompere silenziosamente eventuali override già presenti in `config.json` di produzione che le referenziano.
- Nessuna modifica al meccanismo esistente di override runtime (`ICONF.TRANSLATIONS` nel `config.json` del backend, applicato da `LangService`): resta disponibile per qualsiasi shard (incluso Forestas) che voglia mostrare un valore diverso da "POI" (es. "Luogo"/"Luoghi" per esteso) senza toccare il codice condiviso di wm-core. Questo pattern (default globale in wm-core + override per-shard via `config.json`) è già usato in produzione per la chiave `'layers'` (vedi oc:7643, dove il backend fa override a "Cammini"/"Percorsi"/"Itinerari" per app) — non introduciamo un meccanismo nuovo, riusiamo uno consolidato.
- **Effetto collaterale voluto**: il tab "Punti di interesse" nella home (`home-result.component.html`), che già usa la stessa chiave `'Punti di interesse'`, mostrerà "POI" automaticamente non appena il valore di default cambia — nessuna modifica di codice necessaria lì, ma è un impatto visivo reale e voluto (è esattamente l'unificazione richiesta dal Requisito 1), non un effetto collaterale accidentale.
- **Ordine di applicazione delle traduzioni verificato**: in `LangService._init()` l'ordine è default hardcoded → `APP_TRANSLATION` (build-time, per istanza) → `conf.TRANSLATIONS` da `config.json` (runtime), applicato per ultimo con `setTranslation(lang, translations[lang], true)`. Un override di produzione già esistente su `'Punti di interesse'` in un altro shard **sopravvive** al nuovo default "POI" perché viene applicato dopo — il cambio di default globale impatta solo gli shard che oggi non hanno già un override su quella chiave (Forestas incluso, che è il caso base del ticket).

## Perché

Il ticket segnala che l'app Forestas mostra le etichette "Percorso"/"Percorsi" e "Punti di interesse", terminologia non coerente con quella corretta di progetto ("Sentiero"/"Sentieri" e "Luogo"/"Luoghi", o "POI"). Analizzando il codice è emerso che il problema non è solo terminologico ma strutturale: badge e segment usano due chiavi i18n indipendenti per lo stesso concetto, quindi anche correggendo il testo in un punto l'altro sarebbe rimasto disallineato. La soluzione risolve alla radice unificando le chiavi, e sfrutta il meccanismo di override per-shard già esistente nel backend per le personalizzazioni specifiche di singola app, invece di introdurre logica ad-hoc o hardcoding per Forestas.

## Requisiti

- [ ] Il badge (`wm-layer-features-counter-badge`) usa le stesse chiavi i18n del segment (`wm-home-result`) per le etichette di sentieri e punti di interesse
- [ ] Aggiunta chiave i18n singolare `'Sentiero'` in tutti i 7 file di lingua (it, en, de, es, fr, pr, sq), con traduzione coerente rispetto alla forma plurale già esistente
- [ ] Aggiunta chiave i18n singolare `'Punto di interesse'` in tutti i 7 file di lingua, con valore `"POI"` (invariante rispetto a `'Punti di interesse'`)
- [ ] Valore della chiave `'Punti di interesse'` aggiornato a `"POI"` in tutti i 7 file di lingua
- [ ] Il badge mantiene la distinzione singolare/plurale in base al conteggio (1 vs >1)
- [ ] `track-related-poi.component.html` continua a usare la chiave `'Punti di interesse'` (già corretta), il cui valore visualizzato diventa "POI" per coerenza automatica
- [ ] Le chiavi `'Percorso'`, `'Percorsi'`, `'Luogo'`, `'Luoghi'` restano presenti nei file di traduzione (non rimosse), anche se non più referenziate da nessun template dopo la migrazione
- [ ] Il meccanismo di override via `config.json` → `TRANSLATIONS` continua a funzionare invariato sulle chiavi nuove/modificate (nessuna modifica a `LangService`, `conf.reducer.ts`, `conf.selector.ts`)
- [ ] Aggiunto un test (unit o e2e leggero) che verifica che badge e segment producano lo stesso testo per lo stesso conteggio, per impedire che un futuro refactor di uno dei due componenti reintroduca chiavi divergenti senza che nessuno se ne accorga
- [ ] Verificato se le chiavi `'Punti di interesse'`/`'Sentieri'` sono usate anche in `aria-label` (oltre che come testo visibile) — se sì, valutare se "POI" resta leggibile per screen reader o se serve un `aria-label` esteso separato dal testo visibile
- [ ] Verificato (grep su spec Cypress/Karma) che nessun test esistente asserisca sul testo esatto "Percorso"/"Percorsi"/"Luogo"/"Luoghi"/"Punti di interesse" prima di cambiare i valori i18n

## Rischi

- **Cambio di default globale**: il valore "POI" al posto di "Punti di interesse" si applica a tutte le istanze wm-core, non solo Forestas. Mitigazione: qualsiasi app che preferisca il testo esteso può fare override via `config.json` → `TRANSLATIONS`, meccanismo già esistente e verificato.
- **Traduzioni della nuova chiave singolare `'Sentiero'`** proposte per analogia con la forma plurale già presente in ogni lingua (es. `en: Trail` da `Trails`, `de: Wanderweg` da `Wanderwege`); per le lingue meno presidiate (in particolare `sq`, albanese) la traduzione proposta non è stata validata da un madrelingua — rischio basso ma da tenere presente in review.
- **Chiavi orfane mantenute** (`Percorso`, `Percorsi`, `Luogo`, `Luoghi`): scelta deliberata per non rompere override di produzione non ispezionabili da qui, ma introduce un piccolo debito tecnico (chiavi morte nel codice) da documentare.
- **"POI" come acronimo invariato in 7 lingue** non è stato validato linguisticamente per ciascuna lingua (in particolare per lingue meno diffuse come `sq`); rischio basso, l'acronimo è di uso comune nel settore mappe/GIS. Follow-up in `notes.md`: revisione linguistica post-merge da parte di un madrelingua per le lingue non validate.
- **Collisione di namespace con chiavi simili non toccate**: esistono altre chiavi con testo italiano simile ma scopo diverso, non toccate da questo ticket — `'where': 'Luoghi'` (diversa da `'Luoghi'` del badge), `'poi_type': 'Punti di interesse'`, e nel namespace app-level `'points_of_interest': 'Punti di interesse (VERDE)'` (`core/src/assets/i18n/it.ts`). Rischio di manutenibilità: un futuro sviluppatore potrebbe "correggerle" per allinearle al nuovo "POI" pensando siano collegate, propagando il cambio oltre lo scope di questo ticket.
- **Rollback**: un revert del codice è tecnicamente semplice, ma se nel frattempo altri shard hanno reagito al nuovo default "POI" facendo override nel proprio `config.json` (fuori da questo repo), un revert lascerebbe quegli override ridondanti senza alcuna traccia visibile da questo repo. Un rollback coordinato richiede comunicazione manuale con i team che gestiscono i backend degli shard, non è automatizzabile dal solo frontend.

## Out of scope

- Le altre occorrenze delle parole "percorso"/"tracce" nell'app principale (`core/src/app`, fuori da `wm-core`), che usano un costrutto grammaticale diverso da un'etichetta di categoria (es. "Km percorsi", "Praticabilità del percorso", "Per registrare tracce e poi correttamente..."): restano invariate, per non allargare il raggio d'azione del ticket oltre il problema segnalato.
- Non viene creato alcun nuovo meccanismo di override per-istanza: si riusa quello esistente (`ICONF.TRANSLATIONS` nel `config.json` del backend).
- Non viene configurato in questo ciclo l'override specifico per lo shard Forestas nel suo `config.json` di backend (fuori dal perimetro di questo repo frontend); resta disponibile per il team backend/dev se in futuro Forestas necessitasse di un valore diverso da "POI".
- Rimozione delle chiavi orfane `Percorso`/`Percorsi`/`Luogo`/`Luoghi`: non eseguita in questo ciclo (vedi Rischi).
- Audit dei repo consumer di `wm-core` come submodule (oltre a `webmapp-app`) per verificare che nessuno referenzi direttamente le chiavi orfane: fuori scope, richiederebbe un audit cross-repo più ampio di un Bug fix mirato.
- Modifica delle chiavi simili non collegate (`'where'`, `'poi_type'`, `'points_of_interest'` in `core/src/assets/i18n`): restano invariate, non sono referenziate da badge/segment/track-related-poi.
- Configurazione dell'override specifico per lo shard Forestas nel suo `config.json` di backend: non necessaria in questo ciclo, dato che "POI" diventa il default e coincide con quanto richiesto.

## Moduli toccati

Repo: `wm-core` (submodule di `webmapp-app`, path `core/src/app/shared/wm-core/`)

- `projects/wm-core/src/layer-features-counter-badge/layer-features-counter-badge.component.html` — chiavi aggiornate a `'Sentiero'/'Sentieri'` e `'Punto di interesse'/'Punti di interesse'`
- `projects/wm-core/src/localization/i18n/it.ts` — nuove chiavi + valore `'Punti di interesse'` aggiornato
- `projects/wm-core/src/localization/i18n/en.ts` — idem
- `projects/wm-core/src/localization/i18n/de.ts` — idem
- `projects/wm-core/src/localization/i18n/es.ts` — idem
- `projects/wm-core/src/localization/i18n/fr.ts` — idem
- `projects/wm-core/src/localization/i18n/pr.ts` — idem
- `projects/wm-core/src/localization/i18n/sq.ts` — idem

Nessuna modifica prevista in `home/home-result/home-result.component.html` e `track-related-poi/track-related-poi.component.html` (già usano le chiavi corrette).
