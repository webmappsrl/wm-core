> Ticket: oc:9044 (doppione oc:9048)

# App in inglese: «Tappa N» sulla mappa non tradotto — parte wm-core

## Cosa cambia

`wm-geobox-map` passa già alla mappa `[wmMapTranslationCallback]="translationCallback"`
(`value => this._langService.instant(value)`): da ora la riceve anche `wmMapLayer`, che la usa per il
`ref` disegnato sulla traccia (parte map-core). Il template non cambia.

Si aggiunge solo il ridisegno quando la lingua **cambia davvero**: `refreshLayer$`, già collegato a
`[wmMapLayerRefresh]`, emette anche su `onLangChange` con `startWith(currentLang)`,
`distinctUntilChanged()` e `skip(1)`, che scarta solo il valore iniziale (anche `undefined` alla
prima visita). Un ridisegno per ogni cambio reale, nessuno quando il selettore della lingua riemette
la lingua già in uso. Ogni emissione di `refreshLayer$` chiama `_updateMap()` due volte, dal setter
di `wmMapLayerRefresh` e da `ngOnChanges`: succedeva già con i filtri e non si cambia qui.

Il dizionario è quello di sempre: i file `localization/i18n/*.ts` più le `TRANSLATIONS` della config
dell'app, cioè il tab Translations della Resource App in Nova (`it`, `en`). Le traduzioni dei `ref`
sono dati di camminiditalia e stanno nel tab, non nei file `i18n/*.ts`.

## Perché

Con l'app in inglese il testo sulla traccia resta «Tappa 5», «Tappa 6» (oc:9044 e il doppione
oc:9048, Cammino Minerario di Santa Barbara, layer 56): map-core disegna `ref` così com'è.

Allo scrum del 25/11/2026 10:38 si è deciso di tradurre le stringhe intere, con la T maiuscola come
in `ref`, applicando la traduzione del frontend; `ref` traducibile nel backend è un secondo passo.

Obiettivo fissato da Rubens il 25/11/2026: con l'app in inglese nessun `ref` resta solo in italiano.
Il dizionario traduce la stringa e non la traccia, quindi una chiave vale per tutti i cammini dello
shard: per questo si traducono tutti i valori di `ref` di camminiditalia, non solo quelli del
layer 56.

## Requisiti

- [ ] `refreshLayer$` di `wm-geobox-map` emette anche quando la lingua corrente cambia davvero
      (`onLangChange` → lingua → `startWith(currentLang)` → `distinctUntilChanged()` → `skip(1)`),
      oltre che sulle azioni dei filtri di oggi
- [ ] Alla prima visita (nessun `wm-lang` in localStorage) il primo cambio di lingua ridisegna il
      testo sulle tracce
- [ ] Cambiando lingua dall'app, il testo sulle tracce già visibili cambia senza pan né zoom
- [ ] Aprendo il selettore della lingua senza cambiarla, i tile non si riscaricano
- [ ] Con l'app in inglese la mappa mostra «Stage 1»; in italiano «Tappa 1», anche con il
      dispositivo o il browser in inglese
- [ ] Dati, camminiditalia, tab Translations della Resource App:
  - [ ] le chiavi sono **tutti** i valori distinti di `ref` dello shard (157 in produzione il
        25/11/2026, 1.287 tracce), generate dai dati, mai scritte a mano
  - [ ] `en`: traduzione inglese di ogni chiave, scritta da Webmapp e approvata da Rubens prima
        dell'inserimento
  - [ ] `it`: ogni chiave con valore uguale alla chiave, perché ngx-translate, se manca la chiave
        nella lingua scelta, usa la lingua di riserva (quella del dispositivo, `lang.service.ts:84`)
  - [ ] ordine: locale, poi dev, poi produzione; le inserisce Webmapp
  - [ ] dopo ogni inserimento, un controllo confronta tutti i `ref` dello shard con le chiavi della
        config dell'app: 0 mancanti in `en` e in `it`
  - [ ] i `ref` non si modificano: nessun allineamento delle grafie («Tappa 01», «Tappa 5/A» restano)

## Rischi

- **Effetto su tutto lo shard.** Una chiave vale per ogni traccia con quel `ref`: è voluto
  (obiettivo sopra), e per questo le chiavi coprono tutti i valori.
- **Secondo avvio.** La config arriva prima dalla cache (`handleApiCache`) e `LangService` applica le
  `TRANSLATIONS` con `take(1)`: chi ha già usato l'app vede le traduzioni nuove dall'avvio
  successivo. È il comportamento di tutte le `TRANSLATIONS`; nelle verifiche si ricarica due volte o
  si svuota la cache.
- **Chiavi del dizionario con il punto.** ngx-translate legge il punto come separatore di chiavi
  annidate. Nessuno dei 157 valori contiene un punto; il controllo dopo l'inserimento lo rileverebbe.
- **App nativa.** Le traduzioni nel tab arrivano con la config; la modifica al codice arriva agli
  utenti dell'app nativa solo con una nuova build.
- **Nessuno spec per `wm-geobox-map`.** Il ridisegno al cambio di lingua si verifica a mano nella
  webapp locale (passi nel piano).

## Out of scope

- `ref` traducibile nel backend: secondo passo, deciso allo scrum del 25/11/2026.
- `ref` aggiunti o modificati dal cliente dopo l'inserimento delle chiavi.
- Allineare le grafie dei `ref` nei dati.
- oc:9045 (doppione oc:9049), la difficoltà: stesso giro, ma è una query sui dati senza codice, con
  la propria overview in `LLM_MD/docs/features/9045-app-in-inglese-difficolta-non-tradotta-nella-scheda-tecnica-della-tappa/`.

## Moduli toccati

| Repo | File |
|---|---|
| wm-core | `projects/wm-core/src/geobox-map/geobox-map.component.ts` (`refreshLayer$`) |
| camminiditalia (dati, non codice) | tab Translations della Resource App, lingue `en` e `it` |
