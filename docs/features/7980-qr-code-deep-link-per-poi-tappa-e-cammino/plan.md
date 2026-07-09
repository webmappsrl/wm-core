> Ticket: oc:7980

# Piano implementativo — QR code deep link per poi, tappa e cammino (wm-core)

## Repo coinvolti

| Repo | Percorso locale |
|------|----------------|
| `wm-core` | `core/src/app/shared/wm-core/` |

Questo piano copre solo la parte wm-core. La parte repo principale (listener nativo, Gulp) è in `docs/features/7980-qr-code-deep-link-per-poi-tappa-e-cammino/plan.md` del repo `webmapp-app`.

---

## Task 1 — `handleDeepLink()` in `UrlHandlerService`

**File:** `projects/wm-core/src/services/url-handler.service.ts`

Aggiungere un nuovo metodo pubblico che parsa l'URL ricevuto dal listener nativo `appUrlOpen` (repo principale) ed estrae **path e query param generici** (non solo `/map`), navigando direttamente con `navigateTo()` (non `updateURL()`, per fare un replace pulito invece di un merge con lo stato precedente — coerente con la decisione presa in fase di challenge).

> **Nota (deviazione dal piano iniziale):** la prima versione limitava `handleDeepLink()` al solo path `/map` con `track`/`poi`/`layer`/`filter`. Su richiesta esplicita, lo scope è stato ampliato a qualunque path/query param — vedi `notes.md` e la sezione "Rischi" aggiornata in `overview.md`.

Aggiungere dopo `setTrack()` (riga 157):

```typescript
  /**
   * Gestisce un deep link nativo (Universal Link / App Link) ricevuto da appUrlOpen.
   * Inoltra qualsiasi path e query param dell'URL al router, così qualunque route
   * dell'app è raggiungibile da link esterno, non solo /map.
   * ugc_track/ugc_poi sono esclusi di proposito: dati personali, non raggiungibili da link pubblico.
   */
  handleDeepLink(url: string): void {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return;
    }

    const path = parsed.pathname.replace(/^\//, '');
    const queryParams: Params = {};
    parsed.searchParams.forEach((value, key) => {
      if (key === 'ugc_track' || key === 'ugc_poi') {
        return;
      }
      queryParams[key] = value;
    });

    const posthogProps: Record<string, any> = {url, ...queryParams};
    this._posthogClient?.capture('deepLinkOpened', posthogProps);

    this.navigateTo(path ? [path] : [], queryParams);
  }
```

**Note implementative:**
- `new URL(url)` lancia se l'URL è malformato — il `try/catch` garantisce il comportamento silenzioso richiesto (nessuna azione, nessun errore visibile)
- Nessun allowlist di param: tutti i query param dell'URL vengono inoltrati (eccetto `ugc_track`/`ugc_poi`, sempre esclusi), qualunque sia il path — non serve più conoscere in anticipo quali param esistono per una data route
- Un URL senza path (root) naviga con `navigateTo([], queryParams)`, coerente con come `resetURL()`/altri metodi del servizio già navigano alla home con `[]`
- `posthogProps` viene costruito come variabile `Record<string, any>` (non object literal diretto nella chiamata a `capture()`) perché `WmPosthogProps` (wm-types) è un'interfaccia con proprietà tipizzate — un literal con chiavi arbitrarie (`url`, o qualunque query param) farebbe fallire l'excess-property check di TypeScript. Stesso pattern già usato in `_mobileTrackUrlChange()`
- L'evento PostHog `deepLinkOpened` viene emesso comunque (anche se poi l'id/path non esiste una route valida) — dà visibilità sul fatto che un link è stato aperto, indipendentemente dalla risoluzione lato router

**Commit:** `feat(oc:7980): add handleDeepLink to UrlHandlerService`

---

## Task 2 — Test unitario per `handleDeepLink()`

**File:** `projects/wm-core/src/services/url-handler.service.spec.ts` (nuovo, se non esiste — verificare prima)

Nota: oggi non esiste nessun test per `url-handler.service.ts` (verificato in fase di challenge) e i test dei submodule sono esclusi dalla CI principale (vedi CLAUDE.md, oc:8023) — questo test non gira in CI ma resta utile per validazione locale prima del commit.

Casi da coprire (8 test, tutti verdi):
1. URL valido con `?track=123` → `navigateTo` chiamato con `['map']`, `{track: '123'}`
2. URL valido con `?poi=1&layer=2&filter=3` → tutti e tre i param passati
3. URL con `ugc_track`/`ugc_poi` → questi param NON devono comparire nei `queryParams` passati a `navigateTo`
4. URL malformato (stringa non valida) → nessuna chiamata a `navigateTo`, nessuna eccezione propagata
5. URL su un path diverso da `/map` (es. `/favourites?foo=bar`) → **naviga** su `['favourites']`, `{foo: 'bar'}` (comportamento generico, non più un early return)
6. URL sulla root con query param (es. `/?search=sirena`) → naviga su `[]`, `{search: 'sirena'}`
7. URL su `/map` senza query param → naviga comunque su `['map']`, `{}` (prima non navigava affatto — cambiato con l'ampliamento dello scope)
8. Evento PostHog `deepLinkOpened` inviato per un deep link valido

**Commit:** `test(oc:7980): add unit tests for handleDeepLink`

---

## Verifica

Dopo i due commit:

1. `ng test` locale sul progetto wm-core (non in CI) per confermare che i nuovi test passino
2. Test manuale isolato: da console browser/Angular DevTools, chiamare `urlHandlerService.handleDeepLink('https://1.camminiditalia.webmapp.it/map?track=123')` e verificare che la route cambi a `/map?track=123`
3. Verificare che chiamare `handleDeepLink()` con un URL che include `ugc_track=1` non propaghi quel param
4. Il test end-to-end reale (listener nativo → questo metodo → mappa aperta sulla traccia) va fatto insieme al plan del repo principale, su device reale — vedi `plan.md` del repo `webmapp-app`, sezione Verifica
