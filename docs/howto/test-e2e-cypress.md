# Scrivere un test E2E con Cypress

I test vivono in `cypress/e2e/` alla radice del consumer che monta questo submodule — in
`wm-webapp` è `wm-webapp/cypress/e2e/`, nell'app è `webmapp-app/core/cypress/e2e/` — e le
fixture nella `cypress/fixtures/` accanto. Vale per ogni feature di `wm-core` che tocca la UI.

La regola che governa tutto sta nel `CLAUDE.md`: fixture e `cy.intercept()` per i test di logica
UI, API reali solo negli smoke test. Qui c'è come si fa.

## Come catturare le fixture

Eseguire una volta con il backend reale, salvare in `cypress/fixtures/`:

```bash
curl -sL "https://<shard>.maphub.it/api/v2/elasticsearch?app=geohub_app_<id>&query=<termine>" \
  -o cypress/fixtures/elastic-<termine>.json

curl -sL "https://wmfe.s3.eu-central-1.amazonaws.com/<shard>/<id>/config.json" \
  -o cypress/fixtures/conf-<id>.json
```

## Template di test

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

## Perché `onBeforeLoad` e non `dismissModal`

La privacy modal appare quando `localStorage.privacy-accepted` è assente.
`clearTestState()` cancella il localStorage → il modal riappare a ogni test.
Settare `privacy-accepted` in `onBeforeLoad` previene l'apertura prima ancora che Angular si avvii, eliminando `{force: true}` e `cy.wait()` arbitrari.

## Cosa si guadagna con le fixture

Niente rete durante il test: nessuna dipendenza dal backend e dai suoi dati, nessuna `cy.wait()`
arbitraria per coprire debounce e latenza, nessun id specifico cablato nel test (`layer=55`
diventa una fixture modificabile), e una CI che gira senza backend. La differenza di durata è di
alcune volte, ma non la riportiamo come cifra: cambierebbe al primo test aggiunto.
