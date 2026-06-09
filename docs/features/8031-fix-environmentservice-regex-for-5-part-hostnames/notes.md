> Ticket: oc:8031

# Notes — fix EnvironmentService regex for 5-part hostnames

## Deviazioni dal piano

Nessuna deviazione. Il piano è stato seguito linearmente.

## Bug trovati

Nessun bug aggiuntivo scoperto durante l'implementazione.

## Decisioni

- **Regex `(?:\.[^.]+)+` invece di gruppi opzionali fissi**: accetta N parti TLD invece di aggiungere un terzo `(?:\.[^.]+)?`. Più robusto e non richiede ulteriori patch per nuovi provider o varianti di dominio.
- **Commento inline sulla regex**: aggiunto per documentare il formato Surge atteso (`<appId>.<shardName>[.mobile].<tld-parts…>`), così chiunque modifichi il workflow GitHub Actions sa immediatamente cosa aggiornare.
- **Test spec solo sulla regex, non su `init()` end-to-end**: accesso tramite `(service as any)._wmpackagesRegex` con guard `expect(regex).toBeDefined()` per rilevare rename silenziosi.

## Follow-up

- **Guard in `_assignApi()` — rischio preesistente**: se la regex fa match ma `shardName` non è una chiave valida in `environment.shards`, `_assignApi()` crasha con `TypeError` e `init$` non emette mai `true` (app bloccata su schermata bianca). Questo bug precede questo ticket e non è aggravato dal fix, ma vale la pena aprire un ticket dedicato per aggiungere un guard del tipo `if (!this._environment.shards[this._shardName]) { this._shardName = 'geohub'; }`.
- **`appId=NaN` nel branch `else`**: `parseInt('app', 10)` restituisce `NaN` su hostname come `app.webmapp.it`. Failure silenzioso — costruisce URL tipo `/NaN/config.json`. Anch'esso preesistente, merita un ticket separato.
