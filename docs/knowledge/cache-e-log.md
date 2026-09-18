# Cache delle API e log in produzione

## Come funziona oggi

**La cache condizionale passa da `handleApiCache`.** L'header `If-Modified-Since` lo costruisce l'utility, non il chiamante: `ConfService.getConf()` non deve più fabbricarselo da `localStorage`. L'header condizionale viene inviato solo se `synchronizedApi.getItem()` restituisce un valore che supera anche il `JSON.parse`, così il cache-miss e la cache corrotta ricadono entrambi nel percorso "richiesta piena".

Lo shard `carg` riceve **sempre** dati freschi: lo si ottiene passando `forceFreshRequest: shardName === 'carg'` (quinto parametro, default `false`), non rimuovendo il branch dedicato.

**I log in produzione seguono una regola sola:** `console.error` e `console.warn` fuori da un `catch` restano visibili, il resto viene commentato — non cancellato — dove ha ancora valore diagnostico.

## Perché così

- **Il fix della cache ha toccato due livelli** (oc:8374): limitarlo alla sola utility condivisa non avrebbe risolto il bug segnalato in oc:8357, perché l'header pre-costruito dal chiamante vinceva comunque nello spread `{'If-Modified-Since': cachedLastModified, ...headers}`.
- **Il branch `carg` non è un residuo ma una scelta** (oc:8374): risale al commit `d565438b`, «ignore cache on carg shard… ensure fresh data retrieval». Va preservato, non semplificato.
- **Le validazioni PostHog in `wm-core.module.ts:231-289` non vanno commentate** (oc:8369): sono `console.error`/`console.warn` fuori da un `catch`, quindi ricadono nella regola generale, nonostante si trovino nello stesso blocco delle diagnostiche di inizializzazione che invece sono state commentate. È il punto in cui è più facile sbagliare rileggendo quel file.
- **`posthog-capacitor.client.ts` e `store/features/ec/utils.ts` sono esclusi dal triage** (oc:8369): i loro spec asseriscono esplicitamente sulle chiamate `console.log`/`console.warn` con `expect(...).toHaveBeenCalledWith(...)` e `spyOn`. Toccarli rompe i test.
- **Due log sono commentati e non cancellati** (oc:8369): `utils/localForage.ts` in `updateStatus()` e `store/features/ec/ec.service.ts:91,150` («No changes detected…»). Sono l'unico segnale diagnostico rispettivamente per il download offline di tile e hitmap — area fragile, vedi oc:8190 — e per il bug di cache risolto in oc:8374.

## Debito noto

- **`getPois()` e `getEcTrack()` in `ec.service.ts` non sono coperti dal fix della cache** (oc:8374): reimplementano a mano lo stesso pattern di caching condizionale senza passare da `handleApiCache`, quindi lo stesso bug può essere presente. Richiede un ticket dedicato.
- **Il next-handler di `handleApiCache` è ora `async`** (oc:8374), per via di `await synchronizedApi.setItem(...)`. Un `throw` sincrono in `updateData(data)`, che sta fuori dal `try/catch`, diventerebbe una unhandled rejection invece di essere instradato a `observer.error()` — ricreando in silenzio la stessa classe di bug che il ticket ha risolto. Oggi non è raggiungibile perché `ConfService` e `IconsService` non lanciano, ma se un nuovo consumer introduce un `updateData` che può lanciare, `updateData(data)` va spostato dentro il `try`.
- **`utils/console-override.ts` è codice morto deliberato** (oc:8369): esiste e non è referenziato da nessuna parte. Non è stato attivato in quel ciclo — il contesto completo sul perché è nel CLAUDE.md del repo principale.
