> Ticket: oc:5125

# Notes — Avere una unica AddPhotos per ugc-track e ugc-poi

## Deviazioni dal piano

Nessuna deviazione dai task 1-3 del piano (confermato da review). Aggiunte rispetto al piano originale, emerse dalla review formale (`wm-skills:wm-review-ticket`) prima del commit:

- Aggiunto un getter protetto `photos` in `UgcPropertiesBaseComponent` invece di esporre solo il campo grezzo `_photos` — rispetta alla lettera il requisito originale dell'overview ("getter/metodo protetto per ottenere i photos pronti per il merge"), che l'implementazione iniziale aveva soddisfatto solo in parte.
- Aggiunta JSDoc minima sulla classe base (coerenza con la convenzione CLAUDE.md e con `BaseSaveComponent`, pattern di riferimento).
- Import di `UgcPropertiesBaseComponent` cambiato da path relativo (`../ugc-properties-base/...`) ad alias `@wm-core/ugc-properties-base/...`, per coerenza con lo stile di import del resto dei due file.
- Corretta la motivazione tecnica del rischio "class field shadowing" in `overview.md`: la review ha rilevato che `core/tsconfig.json` ha `useDefineForClassFields: false`, quindi la semantica non è quella ES2022 standard `[[Define]]` come inizialmente scritto — il rischio concreto è più limitato di quanto la formulazione originale suggerisse. La mitigazione (rimozione completa del campo dalle sottoclassi) resta comunque corretta e applicata.

## Bug trovati

Nessuno. La review (5 finder paralleli: correctness, side effect, deviazioni piano, cleanup, design) non ha trovato bug o regressioni introdotte dal refactoring.

## Decisioni

- Scope limitato a `ugc-poi-properties.component.ts` e `ugc-track-properties.component.ts` (edit flow di UGC già sincronizzati) — `draw-ugc.component.ts` (creazione manuale, modello `Photo[]`) e `ModalSaveComponent` (flusso di registrazione GPS nel repo principale, già unificato tramite flag `isWaypoint`) restano fuori scope, come deciso durante la fase di reverse-interaction.
- Nessun test automatico aggiunto — coerente con lo stato attuale del progetto (spec di componenti wm-core non girano in CI, vedi oc:8023).
- Verifica manuale: build/serve puliti, home e mappa testate in browser headless senza errori nuovi introdotti dal cambio; il flusso interattivo reale di editing POI/track con foto è stato verificato manualmente dal developer (richiede account autenticato con UGC sincronizzati, non riproducibile in autonomia).

## Follow-up (fuori scope, emersi dalla review)

- Duplicazione residua non consolidata tra `UgcPoiPropertiesComponent` e `UgcTrackPropertiesComponent`: `slideOptions`, `isEditing$`, `confOPTIONS$`, il pattern `deletePoi()`/`deleteTrack()` (stesso alert di conferma) e `removeUgc*FromUrl()`/`triggerDismiss()` sono ancora duplicati identici. Candidato per un ticket successivo — non affrontato qui per restare nello scope dichiarato (solo AddPhotos).
- `UgcPropertiesBaseComponent` non è esportata da `public-api.ts` del submodule — scelta intenzionale (è un dettaglio implementativo interno, non superficie pubblica), ma da rivalutare se un giorno serve estenderla da fuori wm-core.
- Il naming `UgcPropertiesBaseComponent` include il suffisso "Component" pur non essendo un `@Component` Angular decorato. Non viola alcuna regola ESLint (`@angular-eslint/component-class-suffix` si applica solo a classi decorate), ma è stato segnalato come potenzialmente fuorviante. Lasciato invariato per non introdurre un secondo giro di rename in questo ticket.
