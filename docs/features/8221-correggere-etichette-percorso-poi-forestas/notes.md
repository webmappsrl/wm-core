> Ticket: oc:8221

# Notes — Correggere le etichette "Percorso/Percorsi" e "Punti di interesse"

## Deviazioni dal piano

- **Task 5 (test di regressione badge/segment) saltato**: durante l'esecuzione è emerso che i test Karma dei componenti in `wm-core`/`map-core` sono esclusi deliberatamente dalla CI (`angular.json`/`tsconfig.spec.json` limitano la discovery a `src/app/services/**`) per una decisione presa in oc:8023 — i test dei componenti causavano crash (`NG0201` per `APP_TRANSLATION` mancante in DI, crash Chrome). Un nuovo test Karma non sarebbe stato eseguito in CI (falsa sicurezza) o avrebbe rischiato di crashare per lo stesso problema. Un test Cypress e2e sarebbe stato tecnicamente valido ma avrebbe richiesto nuove fixture (conf.json + elastic con tracks/pois) — lavoro non proporzionato allo scope di questo Bug fix. Decisione presa insieme al developer: saltare il test automatico, tracciare il rischio come follow-up.

## Bug trovati

Nessuno oltre a quanto già discusso in Fase: challenge (vedi overview.md → Rischi).

## Decisioni

- Confermato durante l'esecuzione (Task 1): nessun test esistente (Cypress o Karma) asserisce sul testo esatto delle etichette toccate — nessun rischio di rottura silenziosa in CI.
- Confermato durante l'esecuzione (Task 4): nessuna delle chiavi toccate è usata in `aria-label` — solo il tab "layers" ne ha uno, indipendente da questo cambio. Nessuna azione di accessibilità necessaria.

## Follow-up

- **Revisione linguistica nativa**: le nuove chiavi singolari `'Sentiero'` (in tutte le 7 lingue) e la scelta "POI" invariante singolare/plurale non sono state validate da un madrelingua, in particolare per `sq` (albanese). Da programmare come revisione leggera post-merge.
- **Audit repo consumer di `wm-core`**: non verificato se altri repo Webmapp che usano `wm-core` come submodule referenziano direttamente le chiavi orfane `Percorso`/`Percorsi`/`Luogo`/`Luoghi`. Fuori scope per questo ticket, da considerare se si decide in futuro di rimuoverle.
- **Rimozione chiavi orfane**: `Percorso`, `Percorsi`, `Luogo`, `Luoghi` restano nei 7 file i18n come chiavi morte (nessun componente le referenzia più). Rimozione rimandata a un ticket dedicato, dopo aver verificato che nessun `config.json` di produzione le referenzi in `TRANSLATIONS`.
- **Test di regressione mancante**: nessun test automatico impedisce che un futuro refactor di badge o segment reintroduca chiavi i18n divergenti. Se in futuro si stabilizza un pattern di test e2e più leggero per wm-core, vale la pena aggiungere questa copertura.
