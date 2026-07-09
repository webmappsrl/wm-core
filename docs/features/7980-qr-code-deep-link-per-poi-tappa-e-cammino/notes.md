> Ticket: oc:7980

# Notes — QR code deep link per poi, tappa e cammino (wm-core)

## Deviazioni dal piano

- **Scope di `handleDeepLink()` ampliato da "solo `/map`" a "qualunque path"**: la versione iniziale riconosceva solo il path `/map` e i param `track`/`poi`/`layer`/`filter` (allowlist esplicita), ignorando ogni altro caso (early return silenzioso). Su richiesta esplicita, riscritto per inoltrare **qualunque path e query param** al router — nessuna allowlist, solo l'esclusione fissa di `ugc_track`/`ugc_poi`. Di conseguenza:
  - Un URL su `/map` senza query param ora **naviga comunque** (prima faceva early return)
  - Un URL su un path diverso da `/map` ora **naviga** su quel path (prima faceva early return)
  - Un URL sulla root senza path naviga con `navigateTo([], queryParams)`
- **`Record<string, any>` per i props PostHog invariato**: la costruzione `posthogProps: Record<string, any> = {url, ...queryParams}` (invece di un object literal diretto nella chiamata a `capture()`) resta necessaria con lo scope ampliato — `WmPosthogProps` (wm-types) è un'interfaccia con proprietà tipizzate, un literal con chiavi arbitrarie fallirebbe l'excess-property check di TypeScript.

## Bug trovati

Nessuno. Il cambio di scope non ha richiesto fix, solo rimozione delle condizioni di early-return che limitavano il comportamento originale.

## Decisioni

- **Nessun guard aggiuntivo per path non esistenti nell'app**: se il deep link punta a un path senza una route Angular corrispondente, `navigateTo()` delega al router lo stesso comportamento che avrebbe aprendo quell'URL in un browser (tipicamente redirect/fallback già gestito altrove nell'app) — non serve validare i path lato `handleDeepLink()`.
- **Test aggiornati da 7 a 8 casi** in `url-handler.service.spec.ts`: rimossi i due test che verificavano il vecchio comportamento di early-return ("non naviga se il path non è /map", "non naviga se non ci sono query param riconosciuti"), sostituiti con test che verificano la navigazione generica su path diversi da `/map` e sulla root con query param.

## Follow-up

Nessuno specifico a questo repo — vedi `notes.md` del repo principale per i follow-up generali della feature.
