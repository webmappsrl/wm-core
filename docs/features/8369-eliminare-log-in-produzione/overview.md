> Ticket: oc:8369

# Eliminare log in produzione — submodule wm-core

## Cosa cambia

Triage manuale di tutte le chiamate `console.log/warn/error/debug/info` presenti in `wm-core` (20 file, ~96 occorrenze attive + 8 già commentate in stile pre-esistente senza marker, da normalizzare):

- I `console.log` di puro rumore/debug estemporaneo vengono **cancellati**.
- I log strutturati con contesto utili per diagnosticare problemi futuri vengono **commentati** con marker dedicato `// DEBUG: <riga originale>`.
- **Qualsiasi `console.*` (incluso `console.log`) dentro un blocco `catch` o un percorso di gestione errore resta intatto e visibile anche in produzione** — regola per *posizione*, non solo per metodo. Esempi: `store/auth/auth.effects.ts:49` (catchError del login), `store/conf/conf.reducer.ts:198`, `services/camera.service.ts:247`.
- I `console.error`/`console.warn` **fuori** da un `catch` (es. le validazioni PostHog in `wm-core.module.ts:231-289`, `appId`/`shardName` mancanti) seguono la stessa regola generale per metodo e **restano intatti**, non vengono commentati — corretta un'incoerenza della prima stesura di questo documento, che li classificava erroneamente come "commenta".
- Un `console.log` fuori da `catch` che è l'**unico segnale diagnostico di un'area già documentata come fragile/critica** viene **commentato**, mai cancellato, anche se isolato. Casi identificati: `utils/localForage.ts:577-583` (`updateStatus()`, unico segnale di avanzamento download offline tile, area fragile per shard `carg`, vedi CLAUDE.md oc:8190); `utils/api-cache-handler.ts:57` e `store/features/ec/ec.service.ts:91,150` ("No changes detected, using cached data" — segnale diagnostico primario per il bug di cache risolto in oc:8374).
- I 8 `console.log` già commentati in stile pre-esistente (senza marker, in `services/storage.service.ts:57,346` e `store/features/ugc/ugc.service.ts:94,97,117,120,187,228`) vengono normalizzati al marker `// DEBUG:` per coerenza e ricercabilità.

**Eccezione esplicita**: i `console.log`/`console.warn` che hanno un test unitario dedicato che ne verifica esplicitamente la chiamata (`expect(console.log).toHaveBeenCalledWith(...)`) **non vengono toccati**, indipendentemente dalla loro classificazione — cancellarli o commentarli romperebbe il test. File coinvolti: `services/posthog-capacitor.client.ts` (asserito da `posthog-capacitor.client.spec.ts`), `store/features/ec/utils.ts` (asserito da `ec/utils.spec.ts`).

Non viene toccata `utils/console-override.ts` — resta codice morto, esplicitamente fuori scope (vedi "Out of scope").

## Perché

Stessa motivazione del repo principale (vedi `docs/features/8369-eliminare-log-in-produzione/overview.md` in `webmapp-app`): policy aziendale di non mostrare log in produzione. `wm-core` concentra la quota maggiore di occorrenze (~96 attive su ~180 totali nei 3 repo) perché contiene la maggior parte dei servizi condivisi (PostHog, storage, auth, EC, UGC).

## Requisiti

- [ ] Ogni `console.log/warn/error/debug/info` in wm-core (escluso `utils/console-override.ts`) è stato classificato: cancella / commenta con `// DEBUG:` / lascia intatto
- [ ] Qualsiasi `console.*` (incluso `log`) dentro un `catch` o percorso di gestione errore resta non modificato — regola per posizione, non solo per metodo
- [ ] `wm-core.module.ts:231-289`: i `console.error`/`console.warn` di validazione PostHog restano intatti, non commentati
- [ ] `utils/localForage.ts` (`updateStatus()`), `utils/api-cache-handler.ts:57`, `ec.service.ts:91,150`: restano commentati con `// DEBUG:`, non cancellati — unico segnale diagnostico di aree fragili/bug recenti
- [ ] `services/posthog-capacitor.client.ts` e `store/features/ec/utils.ts`: i `console.log`/`console.warn` asseriti dai rispettivi `*.spec.ts` restano invariati; i test continuano a passare senza modifiche
- [ ] I commenti pre-esistenti senza marker in `storage.service.ts` e `ugc.service.ts` vengono normalizzati a `// DEBUG:`
- [ ] `npm run test` (Karma) continua a passare dopo le modifiche

## Rischi

- **Rottura silenziosa dei test che asseriscono su `console.*`** — mitigato da requisito esplicito sopra; durante l'esecuzione va fatto un controllo incrociato file-per-file (`grep` del nome file nei corrispondenti `*.spec.ts`) prima di modificare qualsiasi `console.*`, non solo sui due file già identificati
- **Codice quasi duplicato triagato in modo indipendente**: `buttons/export-to/export-to.component.ts:131` e `feature-useful-urls/feature-useful-urls.component.ts:83` hanno la stessa identica stringa di errore — rischio che il triage manuale li classifichi diversamente; da trattare in modo identico durante l'esecuzione
- **Nessun test di regressione sulla presenza dei log commentati** — se un futuro refactor/lint-fix automatico rimuove un commento `// DEBUG:` per errore, nessun test lo segnala; rischio accettato, coerente con la decisione di non introdurre enforcement automatico in questo ciclo

## Out of scope

- Attivazione o refactoring di `utils/console-override.ts` — resta inutilizzato; il developer ha segnalato problemi passati con questo meccanismo durante l'analisi di errori in produzione, da affrontare in un ticket futuro dedicato con un sistema di logging attivabile a piacere
- Estensione dell'override di `main.ts` (repo principale) per silenziare `warn`/`error` — deciso di non farlo, i `catch` restano visibili in prod
- Log nativi Capacitor/logcat — fuori scope, copre solo `console.*` JS/TS (vedi overview repo principale)

## Moduli toccati

- `core/src/app/shared/wm-core/projects/wm-core/src/wm-core.module.ts`
- `core/src/app/shared/wm-core/projects/wm-core/src/buttons/export-to/export-to.component.ts`
- `core/src/app/shared/wm-core/projects/wm-core/src/feature-useful-urls/feature-useful-urls.component.ts`
- `core/src/app/shared/wm-core/projects/wm-core/src/localization/lang.service.ts`
- `core/src/app/shared/wm-core/projects/wm-core/src/search-bar/search-bar.component.ts`
- `core/src/app/shared/wm-core/projects/wm-core/src/services/camera.service.ts`
- `core/src/app/shared/wm-core/projects/wm-core/src/services/geolocation.service.ts`
- `core/src/app/shared/wm-core/projects/wm-core/src/services/posthog-capacitor.client.ts` (eccezione: righe testate escluse)
- `core/src/app/shared/wm-core/projects/wm-core/src/services/storage.service.ts`
- `core/src/app/shared/wm-core/projects/wm-core/src/store/auth/auth.effects.ts`
- `core/src/app/shared/wm-core/projects/wm-core/src/store/conf/conf.reducer.ts`
- `core/src/app/shared/wm-core/projects/wm-core/src/store/features/ec/ec.selector.ts`
- `core/src/app/shared/wm-core/projects/wm-core/src/store/features/ec/ec.service.ts`
- `core/src/app/shared/wm-core/projects/wm-core/src/store/features/ec/utils.ts` (eccezione: righe testate escluse)
- `core/src/app/shared/wm-core/projects/wm-core/src/store/features/ugc/ugc.effects.ts`
- `core/src/app/shared/wm-core/projects/wm-core/src/store/features/ugc/ugc.service.ts`
- `core/src/app/shared/wm-core/projects/wm-core/src/swiper/swiper.component.ts`
- `core/src/app/shared/wm-core/projects/wm-core/src/utils/api-cache-handler.ts`
- `core/src/app/shared/wm-core/projects/wm-core/src/utils/localForage.ts`
- `core/src/app/shared/wm-core/projects/demo/src/main.ts`
