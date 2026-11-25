> Ticket: oc:8958

# Nomenclatura regioni su "Filtri"

Il ticket tocca tre repo con lo stesso slug: questo (`wm-core`), `camminiditalia` e `wm-package` (i
nomi delle regioni nei dati). Qui la parte di `wm-core`: la lingua delle opzioni del filtro dei
cammini.

## Cosa cambia

In `search-bar.component.camminiditalia.ts` `options$` si ricalcola anche quando cambia la lingua,
non solo quando cambiano i layer. Il `label` delle opzioni del pannello filtri (`panelOpen`) — regioni, temi, forma, `km`,
`tappe`, Portata, Stagioni — e l'ordine alfabetico delle opzioni seguono la lingua attiva.

## Perché

Con l'app in inglese il cliente vede le regioni in italiano («SARDEGNA»), mentre il `config.json`
ha già `name.en` per tutti i 188 elementi di `taxonomy_where` (es. «Sardinia»), verificato il
25/11/2026.

Le cause sono due, lette nel codice (da riprodurre in browser prima di scrivere il fix):

- **Lingua mai scelta dal profilo** (il caso più probabile del cliente). `LangService._init()`
  (`localization/lang.service.ts:81-90`) all'avvio chiama solo `setDefaultLang(deviceLang)`, e
  `use()` solo se `localStorage['wm-lang']` esiste. In ngx-translate 17 `setDefaultLang` imposta la
  lingua di fallback ed emette `onFallbackLangChange`, ma lascia `currentLang` a `undefined`. Il
  resto dell'app è in inglese perché `wmtrans` e `instant()` ripiegano su `defaultLang`;
  `_deriveOptions()` invece fa `currentLang ?? 'it'` (`search-bar.component.camminiditalia.ts:172`).
- **Cambio lingua dopo il caricamento della config.** `options$` dipende solo da `confMAPLayers`
  (`:83-84`): se la lingua cambia dal profilo, i `label` restano quelli del primo calcolo.

Il difetto c'è identico in `wm-core` `origin/develop` (`f5e2b7c2`) e nella copia della webapp: i due
prodotti montano la stessa variante (`wm-webapp/angular.json:99-100`).

Si ricalcola `options$` invece di mettere `| wmtrans` sulle opzioni: il `label` è usato anche
fuori dal template (`selectedLabel` della riga) e nell'ordinamento (`localeCompare`), e i `label`
di `km`, `tappe`, Portata e Stagioni passano da `instant()`; il ricalcolo li sistema tutti in un
punto.

## Requisiti

- [ ] In `_deriveOptions()` la lingua si risolve come in `wmtrans`: `currentLang ?? defaultLang ?? 'it'`
- [ ] `options$` combina `confMAPLayers` con `onLangChange` e `onFallbackLangChange` di `LangService`
      (partendo dalla lingua risolta) e richiama `_deriveOptions()` a ogni emissione
- [ ] Riproduzione prima del fix e verifica dopo: browser in inglese, `wm-lang` cancellato da
      `localStorage`, filtro regioni con «Sardinia»
- [ ] Passando da `it` a `en` le regioni mostrano `name.en` («Sardinia») e sono riordinate in inglese
- [ ] La pillola del filtro attivo (`selectedLabel`) segue la nuova lingua
- [ ] La selezione corrente del filtro (`draft`) non si perde al cambio lingua: i `value` non cambiano
- [ ] Test unitario, con `LangService` finto, su due casi: `currentLang` undefined e `defaultLang`
      `en` danno i `label` inglesi; un cambio lingua produce nuove opzioni con i `label` dell'altra
      lingua
- [ ] La cartella `search-bar` aggiunta ai due elenchi dei test dell'app (`include` di
      `tsconfig.spec.json` e `architect.test.options.include` di `angular.json`), controllando che il
      totale della suite cresca
- [ ] Il lavoro parte da `wm-core` `origin/develop`; dopo il merge il puntatore si aggiorna in
      `webmapp-app` e in `wm-webapp`

## Rischi

- Solo la variante camminiditalia della search-bar ha il pannello filtri: la base e l'altra variante
  non si toccano.
- I test di wm-core girano solo dentro un prodotto (vedi il `CLAUDE.md` del repo): si lanciano
  dall'app.
- Non si sa se il cliente usi l'app o la webapp: il difetto è lo stesso, per questo il puntatore va
  aggiornato in entrambi i prodotti, altrimenti in uno dei due resta.
- La parte nativa arriva agli utenti solo con una release sugli store; la webapp con il deploy.
- Il maiuscolo non viene dal dato («Sardegna» nel `config.json`) e non si tocca.

## Out of scope

- I nomi italiani delle regioni: sono un dato, si correggono nel backend (`camminiditalia`).
- Gli altri testi tradotti della home fuori dal pannello filtri (`panelOpen`).

## Moduli toccati

| File | Repo |
|---|---|
| `projects/wm-core/src/search-bar/search-bar.component.camminiditalia.ts` | `wm-core` |
| `search-bar.component.camminiditalia.spec.ts` (nuovo) | `wm-core` |
| `core/tsconfig.spec.json`, `core/angular.json` (elenchi dei test) | `webmapp-app` |
| puntatore del submodule `wm-core` | `webmapp-app` e `wm-webapp` |
