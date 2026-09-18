---
paths:
  - "projects/wm-core/src/**/*.spec.ts"
  - "karma.conf.js"
  - "angular.json"
---

# Trappole: spec, `TestBed` e configurazione dei test

Contesto e perché: [docs/knowledge/testbed-isolamento.md](../../docs/knowledge/testbed-isolamento.md).

- **Chiama `TestBed.resetTestingModule()` sia a inizio `beforeEach` sia in `afterEach`.** Jasmine
  randomizza l'ordine dei file: qualunque spec che attiva il TestBed senza resettarlo fa fallire
  il successivo con «Cannot configure the test module when the test module has already been
  instantiated». Il sintomo cambia a ogni run e **non indica il file colpevole**.
- **Il reset del TestBed non azzera i campi `static`.** Se la classe sotto test ne ha, vanno
  azzerati a mano in `afterEach` (unsubscribe, `null`, `clear()` sui `Set`), altrimenti il test
  successivo lavora su stato del precedente.
- **Un service `providedIn: 'root'` va mockato direttamente, non nelle sue dipendenze.**
  `Injector.get(X, null)` non restituisce il default in un TestBed isolato: Angular trova
  comunque il provider root e istanzia l'intera catena. Mocka `{provide: X, useValue: …}`.
- **Un mock di `HttpClient.get()` con `observe: 'response'` deve restituire una `HttpResponse`**,
  non il body: chi legge `response.headers` fallisce con un `TypeError` che sembra un bug del
  service.
- **Uno spec di componente può crashare con `NG0201` per `APP_TRANSLATION` mancante in DI.**
  L'alternativa usata nel repo è costruire il componente con `new`, bypassando il template — ma
  allora `ngOnInit()` non parte da sé e va chiamato esplicitamente dopo aver impostato gli input.
- **`posthog-capacitor.client.spec.ts` chiama `resetTestingModule()` dentro il corpo di un
  `it()`**, non in un hook: un nuovo `describe` eredita il TestBed già istanziato. Difenditi col
  reset nel tuo `beforeEach`; quel file non è stato normalizzato.
