> Ticket: oc:8958

# Notes — Nomenclatura regioni su "Filtri" (`wm-core`)

## Divergenze dal piano, task per task

### Task 1: riproduzione del difetto

Non riprodotto in browser prima del fix: l'estensione Chrome non era collegata. Il caso del cliente
è dimostrato dallo spec (prima del fix, con `currentLang` undefined e `defaultLang` `en`, il filtro
restituiva «Sardegna» e «Valle d'Aosta»). Dopo il fix il dev ha verificato il filtro in locale, con
l'app collegata al backend locale.

### Task 2: lingua risolta e ricalcolo delle opzioni

- `options$` è dentro un `defer(...)`: `_langSvc` è un parametro del costruttore e non è ancora
  assegnato quando si inizializzano i campi della classe, quindi `onLangChange` non si può leggere lì.
- Nel test «keeps the region values across a language change» i `value` si confrontano come
  insieme: l'ordine delle opzioni cambia con la lingua (si ordina per etichetta), ed è voluto.

## Bug trovati

- Lo spec costruisce il componente con `new`: la base della search-bar sottoscrive nel costruttore
  `inputTyped`, `EmptyInputTyped` e `routeFilters`, che sullo store mock senza stato vanno
  sovrascritti con `overrideSelector`, altrimenti l'errore compare in `afterAll`.

## Decisioni

- La lingua si risolve come in `wmtrans`: `currentLang ?? defaultLang ?? 'it'`. Con ngx-translate 17
  `setDefaultLang` imposta solo la lingua di fallback ed emette `onFallbackLangChange`, mai
  `onLangChange`: senza una lingua scelta dal profilo `currentLang` resta `undefined`.
- Si ricalcola `options$` invece di mettere `| wmtrans` sulle opzioni: il `label` serve anche nella
  pillola (`selectedLabel`) e nell'ordinamento.

## Follow-up

- Esporre da `LangService` la lingua attiva come stream (con `onFallbackLangChange`) e il suo
  ripiego: il prossimo componente che deve seguire la lingua rischia lo stesso difetto.
- `home-route-filters.utils.spec.ts` esiste ma la cartella `home-route-filters` non è nei due
  elenchi dei test dell'app: in CI non gira.
- Manca un test che verifichi che `distinctUntilChanged` eviti i ricalcoli con la stessa lingua.
- Dopo il merge: bump del puntatore in `webmapp-app` (insieme agli elenchi dei test) e in
  `wm-webapp`, chiedendo al dev il branch della webapp.
