> Ticket: oc:8284

# Distanza rimanente durante la registrazione traccia UGC (wm-core) Implementation Plan

**Goal:** Alzare la soglia di velocità plausibile usata da `GeoutilsService.getRemainingDistance()` da 3 a 8 m/s, per non forzare una ricerca globale (più costosa) ad ogni fix GPS durante registrazioni UGC in bici/e-bike.

**Architecture:** Modifica di una singola costante condivisa. Nessun nuovo stato, azione, effect o selector — la logica di calcolo (`getRemainingDistance`, `prepareRemainingDistanceContext`) resta invariata, così come tutto il resto di `GeolocationService`/store `user-activity`/`localForage.ts` (esplicitamente esclusi in Fase: challenge e nella review con il CTO, vedi `overview.md`).

**Tech Stack:** Angular 20 (submodule wm-core), Karma + Jasmine.

## Global Constraints

- Nessuna modifica a `GeolocationService`, `store/user-activity/`, `utils/localForage.ts`, `store/features/ec/ec.effects.ts` — solo la costante.
- La modifica è cross-cutting: si applica anche al calcolo esistente in visualizzazione (oc:8177), non solo alla registrazione. Verificare che la suite esistente resti verde.
- Commit convention: `fix(oc:8284): ...` (è un aggiustamento di soglia, non una nuova feature in questo repo).

---

### Task 1: Alzare `REMAINING_DISTANCE_MAX_SPEED_MS` da 3 a 8 m/s

**Files:**
- Modify: `core/src/app/shared/wm-core/projects/wm-core/src/constants/track-remaining-distance.ts:25`
- Test: `core/src/app/shared/wm-core/projects/wm-core/src/services/geoutils.service.spec.ts` (esistente, nessuna modifica — verifica di non-regressione)

**Interfaces:**
- Consumes: nessuna nuova dipendenza — `REMAINING_DISTANCE_MAX_SPEED_MS` è già importata e usata in `geoutils.service.ts` (`getRemainingDistance`, calcolo `maxPlausibleJump`)
- Produces: nessuna nuova interfaccia — il valore esportato resta un `number`, solo il valore numerico cambia

- [ ] **Step 1: Verifica il valore attuale e il contesto d'uso**

```bash
cd /Users/peco/Documents/Apps/webmapp-app
grep -n "REMAINING_DISTANCE_MAX_SPEED_MS" core/src/app/shared/wm-core/projects/wm-core/src/constants/track-remaining-distance.ts core/src/app/shared/wm-core/projects/wm-core/src/services/geoutils.service.ts
```

Output atteso: la riga `export const REMAINING_DISTANCE_MAX_SPEED_MS = 3;` nel file constants, e un uso in `geoutils.service.ts` dentro `getRemainingDistance()` per calcolare `maxPlausibleJump`.

- [ ] **Step 2: Esegui la suite esistente PRIMA della modifica (baseline)**

```bash
cd /Users/peco/Documents/Apps/webmapp-app/core/src/app/shared/wm-core
npx ng test wm-core --configuration=ci
```

Expected: tutti i test verdi (nessun fallimento), incluso `geoutils.service.spec.ts` → describe `getRemainingDistance`. Annota il conteggio totale (es. "163/163") per confrontarlo dopo la modifica.

- [ ] **Step 3: Modifica la costante**

In `core/src/app/shared/wm-core/projects/wm-core/src/constants/track-remaining-distance.ts`, riga 25:

```typescript
// Prima:
export const REMAINING_DISTANCE_MAX_SPEED_MS = 3;

// Dopo:
export const REMAINING_DISTANCE_MAX_SPEED_MS = 8;
```

Aggiorna anche il commento sopra la costante (se presente) per riflettere che la soglia ora copre anche andature in bici/e-bike durante la registrazione UGC (oc:8284), non solo il camminare (oc:8177).

- [ ] **Step 4: Esegui di nuovo la suite e confronta con la baseline**

```bash
cd /Users/peco/Documents/Apps/webmapp-app/core/src/app/shared/wm-core
npx ng test wm-core --configuration=ci
```

Expected: stesso numero di test verdi dello Step 2, nessun nuovo fallimento. In particolare il test `'con lastKnownProgress vincola la ricerca a una finestra locale...'` (righe 152-186 di `geoutils.service.spec.ts`) deve restare verde — usa `elapsedSeconds: 10`, ma l'`impliedJump` in quel caso è vicino a 0 (il punto trovato dalla ricerca locale coincide quasi esattamente col progress noto), quindi non è sensibile al valore di `REMAINING_DISTANCE_MAX_SPEED_MS`.

Se un test fallisce, NON procedere: fermarsi e analizzare se il fallimento è dovuto alla modifica (in tal caso, la modifica ha un effetto collaterale non previsto nell'overview — documentarlo in `notes.md` prima di continuare) o a un problema preesistente scollegato.

- [ ] **Step 5: Commit**

```bash
cd /Users/peco/Documents/Apps/webmapp-app/core/src/app/shared/wm-core
git add projects/wm-core/src/constants/track-remaining-distance.ts
git commit -m "fix(oc:8284): alza soglia velocità plausibile a 8 m/s per registrazione in bici"
```

---

## Note per l'esecutore

Questo file copre **solo** il submodule wm-core. Il lavoro principale (UI del box di registrazione) è nel repo principale — vedi `docs/features/8284-distanza-rimanente-registrazione-ugc/plan.md` in `/Users/peco/Documents/Apps/webmapp-app`. I due piani sono indipendenti: questo può essere eseguito e commesso senza attendere l'altro (e viceversa), ma la PR di wm-core va aperta prima o insieme a quella del repo principale, perché quest'ultimo dipende dai selettori già esistenti in wm-core (nessuna dipendenza inversa da questo task).
