> Ticket: oc:8221

# Piano di implementazione — Correggere le etichette "Percorso/Percorsi" e "Punti di interesse"

Riferimento: [overview.md](./overview.md)

## Task 1 — Verifica pre-modifica: nessun test esistente asserisce sul testo esatto

Prima di toccare i valori i18n, verificare che nessun test Cypress (`core/cypress/e2e/`) o unit test (`*.spec.ts`) faccia assert su "Percorso", "Percorsi", "Luogo", "Luoghi", "Punti di interesse" come testo visualizzato.

```bash
grep -rn "Percorso\|Percorsi\|Luogo\|Luoghi\|Punti di interesse" core/cypress/e2e/ core/src/app/shared/wm-core/projects/wm-core/src/**/*.spec.ts
```

Se trovati: segnalarli esplicitamente in `notes.md` prima di procedere (non bloccano il task, ma vanno aggiornati in coerenza).

**Nessun commit per questo task** (solo verifica).

## Task 2 — Aggiungere le chiavi i18n mancanti in tutti i file di lingua

File: `core/src/app/shared/wm-core/projects/wm-core/src/localization/i18n/{it,en,de,es,fr,pr,sq}.ts`

Per ciascun file:
1. Aggiungere la chiave singolare mancante `'Sentiero'` (accanto alla chiave `'Sentieri'` già esistente), con traduzione coerente:
   - `it.ts`: `'Sentiero': 'Sentiero'`
   - `en.ts`: `'Sentiero': 'Trail'`
   - `de.ts`: `'Sentiero': 'Wanderweg'`
   - `es.ts`: `'Sentiero': 'Sendero'`
   - `fr.ts`: `'Sentiero': 'Sentier'`
   - `pr.ts`: `'Sentiero': 'Trilha'`
   - `sq.ts`: `'Sentiero': 'Shtegu'`
2. Aggiungere la chiave singolare mancante `'Punto di interesse'`, valore `'POI'` in tutte le lingue (invariante, per decisione approvata in overview).
3. Aggiornare il valore della chiave esistente `'Punti di interesse'` a `'POI'` in tutte le lingue (era il testo esteso tradotto per lingua).
4. **Non toccare** le chiavi `'Percorso'`, `'Percorsi'`, `'Luogo'`, `'Luoghi'` — restano invariate (chiavi orfane per decisione, vedi overview → Rischi).

Non serve toccare `'where'`, `'poi_type'`, `'points_of_interest'` (chiavi diverse, fuori scope).

**Commit:** `feat(oc:8221): add Sentiero/Punto di interesse i18n keys and shorten POI label`

## Task 3 — Unificare le chiavi nel badge contatore

File: `core/src/app/shared/wm-core/projects/wm-core/src/layer-features-counter-badge/layer-features-counter-badge.component.html`

Sostituire:
- `(countEcTracks > 1 ? 'Percorsi' : 'Percorso')|wmtrans` → `(countEcTracks > 1 ? 'Sentieri' : 'Sentiero')|wmtrans`
- `(countEcPoi > 1 ? 'Luoghi' : 'Luogo')|wmtrans` → `(countEcPoi > 1 ? 'Punti di interesse' : 'Punto di interesse')|wmtrans`

Nessuna modifica alla logica singolare/plurale (mantenuta, come da overview).

**Commit:** `fix(oc:8221): use unified i18n keys in layer features counter badge`

## Task 4 — Verificare l'uso di queste chiavi come aria-label

Cercare in `home-result.component.html` e nei componenti collegati se `'Sentieri'`/`'Punti di interesse'` vengono usate anche in attributi `aria-label` (non solo come testo visibile), sul modello di quanto già fatto per il tab `'layers'` (`[attr.aria-label]="('layers'|wmtrans) + ', ' + countLayers + ' risultati'"`).

Se sì: valutare se "POI" resta comprensibile per uno screen reader o se serve un testo esteso separato solo per l'aria-label (non richiesto esplicitamente dall'overview, ma da verificare prima di dare per chiuso il task).

**Nessun commit se non emergono modifiche**; se emergono, commit separato: `fix(oc:8221): keep descriptive aria-label for POI tab`

## Task 5 — Test di regressione: badge e segment devono restare allineati

Aggiungere un test (Karma o Cypress, a seconda di cosa già copre questi componenti) che verifichi che badge (`wm-layer-features-counter-badge`) e segment (`wm-home-result`) producano lo stesso testo per lo stesso conteggio di sentieri/POI — per impedire che un futuro refactor di uno dei due componenti reintroduca chiavi divergenti senza che nessuno se ne accorga.

**Commit:** `test(oc:8221): assert badge and segment share the same track/poi labels`

## Task 6 — Verifica manuale in locale

```bash
cd core && npm start
```

Verificare visivamente:
- Badge contatore layer: mostra "1 Sentiero"/"N Sentieri" e "1 POI"/"N POI"
- Tab segment nella home: mostra "Sentieri" e "POI" (non più "Punti di interesse")
- Lista POI correlati a un sentiero (`track-related-poi`): mostra "POI" come intestazione
- Nessun troncamento/overflow CSS anomalo con il testo più corto "POI" rispetto al precedente "Punti di interesse"

**Nessun commit per questo task** (solo verifica).

## Task 7 — Aggiornare notes.md con i follow-up

Documentare in `notes.md` (Fase: notes, a fine esecuzione):
- Follow-up: revisione linguistica nativa delle nuove traduzioni singolari (in particolare `sq`) e della scelta "POI" invariante in tutte le 7 lingue
- Follow-up: eventuale audit futuro dei repo che consumano `wm-core` come submodule, per verificare che nessuno referenzi le chiavi orfane `Percorso/Percorsi/Luogo/Luoghi`
- Follow-up: eventuale rimozione delle chiavi orfane in un ticket dedicato, una volta verificato che nessun `config.json` di produzione le referenzia

**Nessun commit per questo task** (documentazione, va nello stesso commit finale insieme a update-context, come da workflow).

---

## Riepilogo commit previsti (in ordine)

1. `feat(oc:8221): add Sentiero/Punto di interesse i18n keys and shorten POI label`
2. `fix(oc:8221): use unified i18n keys in layer features counter badge`
3. *(eventuale)* `fix(oc:8221): keep descriptive aria-label for POI tab`
4. `test(oc:8221): assert badge and segment share the same track/poi labels`
5. Commit finale con `notes.md` + eventuale aggiornamento `CLAUDE.md` (Fase: update-context), dopo approvazione esplicita del developer (review-gate)

Nessun commit va eseguito automaticamente durante l'esecuzione — solo dopo il gate di revisione (execution: review-gate) e conferma esplicita del developer, per ogni singolo commit.
