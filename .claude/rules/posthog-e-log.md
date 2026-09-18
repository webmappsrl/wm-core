---
paths:
  - "projects/wm-core/src/services/posthog-context.service.ts"
  - "projects/wm-core/src/services/posthog-capacitor.client.ts"
  - "projects/wm-core/src/services/geolocation.service.ts"
  - "projects/wm-core/src/wm-core.module.ts"
  - "projects/wm-core/src/utils/console-override.ts"
---

# Trappole: eventi PostHog e log in produzione

Contesto e perché: [docs/knowledge/posthog.md](../../docs/knowledge/posthog.md) e
[docs/knowledge/cache-e-log.md](../../docs/knowledge/cache-e-log.md).

- **Non costruire a mano il contesto di un evento.** `PosthogContextService` arricchisce già ogni
  `capture()` in `_buildContext()` con posizione, feature corrente e `user_id`. Aggiungere quei
  campi al call site li duplica e li fa divergere.
- **Ogni campo aggiunto al contesto condiviso finisce su tutti gli eventi**, non solo su quello
  che stai scrivendo. È una decisione di ampiezza, non un dettaglio: prima di aggiungerne uno,
  considera che viaggerà su ogni `capture()` del repo.
- **`WmPosthogProps` è un'interfaccia tipizzata**: un object literal con chiavi arbitrarie passato
  a `capture()` fallisce l'excess-property check di TypeScript. Vanno costruiti a parte come
  `Record<string, any>`.
- **Non c'è alcun gate di consenso privacy su PostHog**, e nessun flag `OPTIONS` per-shard: nessun
  evento è mai stato gated su `hasPrivacyAgree`. Se aggiungi un evento che tocca dati personali,
  è una decisione da portare al dev, non da dare per acquisita.
- **Nei `console.*` di questo repo la cancellazione non è mai automatica**: `console.error` e
  `console.warn` restano intatti, i log diagnostici si commentano con `// DEBUG:`, il rumore si
  cancella. Le validazioni in `wm-core.module.ts` sono `console.error`/`console.warn` fuori da un
  `catch`: sono volute.
- **`posthog-capacitor.client.ts` e `store/features/ec/utils.ts` sono esclusi dal triage dei log**
  perché i loro output sono asseriti da test unitari: toccarli rompe la suite.
- **`utils/console-override.ts` è codice morto deliberato**: esiste e nessuno lo importa. Non
  attivarlo senza una decisione esplicita.
