> Ticket: oc:8918

# VARIANTI / TAPPE (segnalazione) — parte wm-core

> Overview principale nel repo `webmapp-app`, stesso slug. Il calcolo di `stage_count` è nel
> backend `camminiditalia`.

## Cosa cambia

- Nello shard camminiditalia la card del cammino mostra `attributes.stage_count` del layer, che il
  backend calcola senza varianti, invece del numero di tracce contato dalle aggregazioni di
  Elastic. Lo fa una variante camminiditalia del badge, attivata con `fileReplacements` dal
  prodotto che la monta. Se il layer non ha `stage_count`, il badge conta come oggi.
- Nel dettaglio del passaporto i km del cammino completato sono quelli delle tappe effettivamente
  percorse (stessa regola della scheda del diario), invece della somma di tutte le righe, varianti
  non percorse comprese.

Negli altri shard nulla cambia.

## Perché

Le varianti sono tracce del cammino in Elastic e righe del progress del passaporto: la card della
Via Valeriana dice «12 Tappe» (le tappe sono 10), e i km del cammino completato sommano anche le
varianti.

## Requisiti

- [ ] Classe base `@Directive()` astratta `layer-features-counter-badge-base.component.ts`, mai
  soggetta a `fileReplacements`, con `layerId`, gli observable del conteggio e `stageCount$`
  (default `null`)
- [ ] Il template condiviso mostra `stageCount$` con lo stesso markup ed etichetta
  (`Sentieri`/`Sentiero`) del conteggio tracce, al posto di quello; senza, comportamento attuale.
  Il conteggio dei POI resta invariato
- [ ] Variante `layer-features-counter-badge.component.camminiditalia.ts`: `stageCount$` da
  `attributes.stage_count` del layer `layerId` in `confMAPLayers`; non importa il file originale
- [ ] Le uscite GPS del cammino completato contano le sole tappe percorse (`completedStages`)
- [ ] `passport-detail` calcola `totalKm` come `diary-route-data.utils.ts`: `userDistanceTotal`,
  altrimenti `totalDistanceKm` delle sole tappe `completed`; la regola sta in un punto solo,
  condiviso fra diario e passaporto
- [ ] Test: badge con e senza `stageCount`; km del passaporto con una variante percorsa e una no

## Rischi

- Il badge con `stageCount` non segue più ricerca e filtri: accettato, il numero descrive il
  cammino.
- La variante `.camminiditalia.ts` non è compilata dalla CI, che builda il default: va provata con
  la build camminiditalia (fatto: compila e il bundle contiene `stage_count`).
- Ogni prodotto che monta wm-core deve registrare la variante nel proprio `angular.json`: la
  webapp, finché non lo fa, mostra ancora il conteggio con le varianti.

## Out of scope

Elenchi delle tappe con le varianti; km dell'immagine di condivisione.

## Moduli toccati

- `projects/wm-core/src/layer-features-counter-badge/layer-features-counter-badge-base.component.ts` (nuovo)
- `projects/wm-core/src/layer-features-counter-badge/layer-features-counter-badge.component.ts` e `.html`
- `projects/wm-core/src/layer-features-counter-badge/layer-features-counter-badge.component.camminiditalia.ts` (nuovo)
- spec del badge (default e variante, nuovi)
- `projects/wm-core/src/passport/passport.utils.ts`, `passport-detail/passport-detail.component.ts` e spec
- `projects/wm-core/src/diaries/diary-route-data.utils.ts`
