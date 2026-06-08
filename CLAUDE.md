# wm-core — CLAUDE.md

## Test E2E con Cypress — pattern standard

I test Cypress vivono in `wm-webapp/cypress/e2e/`. Per ogni feature di wm-core che tocca la UI:

### Regola generale

**Usare sempre `cy.intercept()` con fixture** — mai dipendere da API reali in test di logica UI.

### Come catturare le fixture

Eseguire una volta con il backend reale, salvare in `cypress/fixtures/`:

```bash
curl -sL "https://<shard>.maphub.it/api/v2/elasticsearch?app=geohub_app_<id>&query=<termine>" \
  -o cypress/fixtures/elastic-<termine>.json

curl -sL "https://wmfe.s3.eu-central-1.amazonaws.com/<shard>/<id>/config.json" \
  -o cypress/fixtures/conf-<id>.json
```

### Template di test

```typescript
const ELASTIC_URL = '**/api/v2/elasticsearch*';
const CONF_URL    = '**/config.json';

const setupIntercepts = (elasticFixture = 'elastic-init') => {
  cy.intercept('GET', CONF_URL,    {fixture: 'conf-1.json'}).as('conf');
  cy.intercept('GET', ELASTIC_URL, {fixture: elasticFixture}).as('elastic');
};

// Setta privacy-accepted prima che Angular si avvii → nessun modal backdrop
const visitWithPrivacy = (url: string) => {
  cy.visit(url, {
    onBeforeLoad(win) {
      win.localStorage.setItem('privacy-accepted', 'true');
    },
  });
};

const waitForApp = () => {
  cy.wait('@conf');
  cy.wait('@elastic');
};
```

### Perché `onBeforeLoad` e non `dismissModal`

La privacy modal appare quando `localStorage.privacy-accepted` è assente.
`clearTestState()` cancella il localStorage → il modal riappare a ogni test.
Settare `privacy-accepted` in `onBeforeLoad` previene l'apertura prima ancora che Angular si avvii, eliminando `{force: true}` e `cy.wait()` arbitrari.

### Vantaggi rispetto ai test con API reali

| | API reali | Fixture + intercept |
|---|---|---|
| Velocità | ~51s | ~13s |
| Flakiness | Alta (backend, dati) | Zero |
| `cy.wait()` arbitrari | Necessari (debounce + network) | Eliminati |
| Dipendenza da ID specifici | Sì (`layer=55`) | No (fixture mockabili) |
| CI senza backend | No | Sì |

### Quando usare API reali

Solo per smoke test ("il sistema è su e risponde"), non per test di logica UI.

## Features implementate

| Feature | Ticket | Moduli toccati |
|---|---|---|
| Ricerca per layer/cammino nella home | oc:7643 | `home-result`, `ec` store (actions/reducer/effects/selectors), `layer-box`, `layer-features-counter-badge`, `user-activity.reducer` |

## Decisioni architetturali

### Tab layers nella home (oc:7643)

**Store**

- `HomeResultTab` (`wm-types`) include `'layers' | null` — `null` come stato iniziale distingue "nessuna scelta utente" da "utente ha cliccato tracks esplicitamente"
- `homeResultTabSelected` si resetta a `null` ad ogni `inputTyped` — permette al default di tornare a `'layers'` dopo ogni nuova digitazione
- `ecTracksInitAggregationsSuccess` è un'azione dedicata che aggiorna **solo** `initialAggregations` nello store — non tocca `hits` né `aggregations` per non sporcare i risultati di ricerca correnti
- L'effetto `initLayerAggregations$` si attiva su `loadConfSuccess` e chiama `ecSvc.getQuery({})` senza parametri per ottenere le aggregazioni iniziali non filtrate

**Selettori**

- `layerFeaturesTotalCount` usa `initialAggregationBucketsLayers` (da `initialAggregations`) — il contatore badge non cambia al variare della query di ricerca
- `layerFeaturesCount` usa le aggregazioni filtrate correnti — usato ovunque tranne che nella tab layers della home

**Componente home-result**

- `normalizeString()` è una funzione pura a livello di modulo (non metodo di classe) per evitare problemi con gli initializer delle property che non possono chiamare metodi di istanza
- `filteredLayers$`, `countLayers$`, `showResultTabSelected$` sono inizializzati nel costruttore (non come property initializer) per lo stesso motivo
- `ecLayer` è aggiunto al `combineLatest` con `.pipe(startWith(null))` — senza questo, la prima emissione veniva bloccata finché `ecLayer` non emetteva
- Logica `showResultTabSelected$`:
  1. Se l'utente ha cliccato esplicitamente un tab valido → mostra quel tab
  2. Se ci sono layer disponibili (e nessun layer aperto) → mostra `'layers'`
  3. Fallback: `'tracks'` → `'pois'` → `null`

**i18n**

- Chiave `'layers'` con traduzione di default `'Layers'` in tutti i file i18n
- Il backend fa override via `wmlang` per ogni app (es. "Cammini", "Percorsi", "Itinerari")
- `LangService.instant(layer.title as any)` risolve sia stringhe che oggetti `{it: '...', en: '...'}` — necessario perché i titoli dei layer dalla conf sono oggetti i18n, non stringhe

**layer-box**

- `@Input() showBadge = true` — permette di nascondere il badge (usato in altri contesti)
- `@Input() useTotal = false` — quando `true` il badge usa `layerFeaturesTotalCount` (non filtrato)
