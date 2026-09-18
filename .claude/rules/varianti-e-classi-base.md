---
paths:
  - "projects/wm-core/src/**/*.camminiditalia.ts"
  - "projects/wm-core/src/**/*base.component.ts"
  - "projects/wm-core/src/**/*-shared.scss"
---

# Trappole: varianti per shard e classi base

Contesto, e il criterio per decidere **se** estrarre una base:
[docs/knowledge/varianti-per-shard.md](../../docs/knowledge/varianti-per-shard.md).

- **`@Injectable()` è obbligatorio su ogni classe base plain estesa da un `@Component` con
  parametri costruttore.** Senza il decorator, Angular non genera la factory DI (`ɵfac`) da cui
  la sottoclasse eredita i tipi dei parametri. L'errore `NG0202` compare **solo a runtime reale**:
  uno spec che istanzia con `new` bypassa la DI e non lo vede. C'è una guardia di regressione in
  `home-layer-base.component.spec.ts` che verifica che `ɵfac` sia definito — replicala.
- **Solo il `.ts` deve essere gemello**, per il vincolo di schema di `fileReplacements`. Il
  template non va duplicato: la variante può puntare allo stesso `templateUrl` del default quando
  la struttura DOM non cambia, e avere `styleUrls` propri.
- **Splittare uno SCSS fra base e variante può far sparire lo stile del default.** È già successo:
  regole generiche finite solo nel file della variante hanno lasciato tutti gli altri shard senza
  stile — titolo come testo semplice, logo non dimensionato. Dopo uno split, verifica che nel file
  di default resti tutto ciò che era comune prima, e che nel partial condiviso finisca solo ciò
  che è davvero comune.
