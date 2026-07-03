> Ticket: oc:5125

# Avere una unica AddPhotos per ugc-track e ugc-poi

## Cosa cambia

Il ticket originale (creato il 12/03/2025) referenzia `modal-save.component` e `modal-waypoint-save.component`, nomi non più esistenti nella codebase attuale. Un'indagine nel codice ha permesso di individuare l'ambito reale, confermato con l'utente:

- Il flusso di **registrazione** (creazione nuovo track/POI via GPS, `core/src/app/components/shared/modal-save/modal-save.component.ts`) è **già unificato**: un solo `ModalSaveComponent` gestisce sia track che waypoint tramite il flag `isWaypoint`, ed usa già `wm-image-picker` condiviso. Nessuna modifica necessaria qui.
- Il flusso di **editing di UGC già sincronizzati** (in `wm-core`) ha invece due componenti separati con logica duplicata attorno all'AddPhotos: `ugc-poi-properties.component.ts` e `ugc-track-properties.component.ts`. Entrambi:
  - hanno lo stesso identico metodo `photosChanged(photos: Media[]): void { this._photos = photos; }`
  - passano `this._photos ?? []` come `media` nel payload di update (`updatePoi()` / `updateTrack()`)
  - hanno un metodo `enableEditing()` duplicato e inerte (dead code, non richiamato da nessun template)

Questa feature estrae la logica duplicata in una classe base astratta condivisa, mantenendo separata la logica di dominio (dispatch delle action `updateUgcPoi`/`updateUgcTrack`, che restano specifiche di ciascun componente).

## Perché

Ridurre la duplicazione di codice tra i due componenti di editing UGC, rendendo più facile mantenere in futuro la logica di gestione foto (es. se cambierà il modello `Media` o la validazione).

## Requisiti

- [ ] Creare `UgcPropertiesBaseComponent` (classe astratta) in `projects/wm-core/src/ugc-properties-base/ugc-properties-base.component.ts`, con:
  - campo protetto `_photos: Media[] = []`
  - metodo `photosChanged(photos: Media[]): void`
  - getter/metodo protetto per ottenere i photos pronti per il merge nel payload (nessun fallback `?? []`: il campo è sempre un array valido per costruzione, il fallback attuale nei due componenti è codice morto)
- [ ] `UgcPoiPropertiesComponent` estende `UgcPropertiesBaseComponent`, rimuove **completamente** il proprio `photosChanged()` e la propria dichiarazione di `_photos` (nessuna ridichiarazione, nemmeno senza inizializzatore — vedi Rischi), usa l'helper ereditato in `updatePoi()`
- [ ] `UgcTrackPropertiesComponent` estende `UgcPropertiesBaseComponent`, rimuove **completamente** il proprio `photosChanged()` e la propria dichiarazione di `_photos`, usa l'helper ereditato in `updateTrack()`
- [ ] Rimuovere il metodo `enableEditing()` duplicato e inerte da entrambi i componenti (dead code, nessun template lo richiama)
- [ ] Comportamento a runtime invariato: editing POI e track con AddPhotos deve funzionare esattamente come prima (nessuna regressione visibile)

## Rischi

- **Class field shadowing**: se una sottoclasse lascia per errore una propria dichiarazione di `_photos` (anche solo `private _photos: Media[];` senza inizializzatore, es. per un merge non pulito), il campo può interferire col valore ereditato. Nota: con `useDefineForClassFields: false` in `core/tsconfig.json` (semantica `[[Set]]`, non ES2022 `[[Define]]`), una dichiarazione senza inizializzatore non genera codice a runtime e quindi non azzererebbe il valore — il rischio concreto in questa codebase è più limitato di quanto una lettura ES2022-standard suggerirebbe. Mitigato comunque da un requisito esplicito di implementazione (rimozione completa, non solo svuotamento) e dalla verifica manuale end-to-end pre-commit.
- **Nessun test automatico di regressione**: gli spec di componenti wm-core non girano in CI (`tsconfig.spec.json` limita l'include a `src/app/services/**/*.spec.ts`, decisione oc:8023). Il rischio di regressione silenziosa è mitigato da una verifica manuale end-to-end (edit POI + edit track con foto) prima del commit, non da un test automatico.
- **Scope ridotto rispetto al ticket originale**: `draw-ugc.component.ts` (flusso di creazione manuale, usa `Photo[]` invece di `Media[]`) resta esplicitamente fuori scope — decisione confermata con l'utente per evitare di forzare un'astrazione tra due modelli dati semanticamente diversi (foto locali non sincronizzate vs foto già sincronizzate con id).
- **`_photos` non resettato su riuso del componente (preesistente, invariato)**: se un'istanza venisse riusata da Ionic per un'entità diversa senza essere distrutta, `_photos` conserverebbe lo stato dell'entità precedente finché l'utente non tocca di nuovo l'image-picker. Comportamento identico oggi in entrambi i componenti — la classe base si limita a spostare il codice esistente, non introduce né corregge questo edge case. Esplicitamente lasciato invariato e fuori scope.
- **Rollback cross-repo**: `wm-core` è un submodule condiviso da più repo (webmapp-app, osm2cai, camminiditalia). Il rollback tecnico del commit è semplice (nessuna migrazione dati/API), ma se una regressione silenziosa emergesse solo in produzione (assenza di test automatici), un rollback isolato richiederebbe coordinare l'aggiornamento del puntatore submodule in tutti i repo consumer che avessero già bumpato la versione. Rischio accettato, mitigato dalla verifica manuale pre-commit.

**Nota — falso positivo scartato durante la challenge**: è stata inizialmente ipotizzata una fix per "foto locali non sincronizzate inviate in una PUT non valida verso il backend". Verificato che `ugc.service.ts: _buildFormData()` già gestisce correttamente questo caso (filtra `media.filter(p => !p.id)` e li allega come file multipart `images[]` nella stessa richiesta di update) — non è un bug, nessuna modifica necessaria.

## Out of scope

- `draw-ugc.component.ts` (creazione manuale, modello `Photo[]`) — nessuna modifica
- `ModalSaveComponent` (flusso di registrazione GPS, repo principale `core/`) — già unificato, nessuna modifica
- Aggiunta di test automatici (nessuno spec esiste oggi per questi componenti; non aggiunti in questo ciclo, coerente con lo stato attuale del progetto)
- Modifiche a `tsconfig.spec.json` / configurazione CI

## Moduli toccati

- `wm-core/projects/wm-core/src/ugc-properties-base/ugc-properties-base.component.ts` (nuovo)
- `wm-core/projects/wm-core/src/ugc-poi-properties/ugc-poi-properties.component.ts` (modificato)
- `wm-core/projects/wm-core/src/ugc-track-properties/ugc-track-properties.component.ts` (modificato)
