> Ticket: oc:8031

# fix EnvironmentService regex for 5-part hostnames

## Cosa cambia

`_wmpackagesRegex` in `EnvironmentService` viene aggiornata da una regex con gruppi opzionali fissi a una che accetta N parti di hostname (N ≥ 3), catturando sempre e solo `appId` (gruppo 1) e `shardName` (gruppo 2).

## Perché

I domini Surge preview generati dal workflow GitHub Actions hanno 5 parti (es. `1.camminiditalia.pr-53.surge.sh`). La regex attuale supporta al massimo 4 parti non-mobile, causando il fallback al branch `else` che forza `shardName = 'geohub'` e carica l'app sbagliata.

## Requisiti

- [ ] La regex aggiornata fa match su hostname a N parti (N ≥ 3), catturando `appId` e `shardName`
- [ ] Regression: continua a fare match per hostname a 3, 4 e 4+mobile parti
- [ ] La regex NON fa match su hostname senza `appId` numerico come prefisso (es. `app.webmapp.it`)
- [ ] File spec `environment.service.spec.ts` creato con test case per tutti i pattern documentati
- [ ] Lo spec accede alla regex tramite `(service as any)._wmpackagesRegex` — la proprietà rimane `private`

## Rischi

- **Nessun rischio di over-matching**: il prefisso `^(\d+)\.` vincola il match a hostname che iniziano con un numero. Hostname produzione come `app.webmapp.it` o `geohub.webmapp.it` non vengono toccati.
- **Guard `_oldSubdomains` invariata**: il controllo `!this._oldSubdomains.includes(wmpackagesRegexMatch[2])` a riga 57 rimane intatto e continua a filtrare shard name legacy (`app`, `geohub`, `mobile`).

## Out of scope

- Test dell'`init()` end-to-end con mock di `window.location`
- Supporto ad altri provider di preview oltre a Surge
- Variante mobile dei domini Surge preview (`*.mobile.pr-N.surge.sh`)

## Moduli toccati

| File | Operazione | Repo |
|---|---|---|
| `projects/wm-core/src/services/environment.service.ts` | Modifica regex riga 12 | `wm-core` |
| `projects/wm-core/src/services/environment.service.spec.ts` | Nuovo file | `wm-core` |
