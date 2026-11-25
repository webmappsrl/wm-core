# Lingua delle opzioni del filtro dei cammini

## Come funziona oggi

- Le opzioni del pannello filtri della variante camminiditalia della search-bar (`options$` in
  `search-bar.component.camminiditalia.ts`) si ricalcolano quando cambiano i layer, su
  `onLangChange` e su `onFallbackLangChange`.
- La lingua si risolve come in `wmtrans`: `currentLang ?? defaultLang ?? 'it'`.
- I nomi vengono dal `name` per lingua di `taxonomy_where` nel `config.json`; i nomi italiani si
  correggono nel backend, non qui.

## Perché così

- **`defaultLang` e `onFallbackLangChange`** (oc:8958): al primo avvio, senza una lingua scelta dal
  profilo, `LangService` chiama solo `setDefaultLang`, che con ngx-translate 17 (la versione
  dell'app; il package dichiara `^16`) non imposta `currentLang` e non emette `onLangChange`. Il
  resto dell'app era in inglese grazie al ripiego di `wmtrans`, il filtro restava in italiano
  («Sardegna» invece di «Sardinia»).
- **Ricalcolo di `options$` e non `| wmtrans` sulle opzioni** (oc:8958): il `label` serve anche nella
  pillola del filtro attivo (`selectedLabel`) e nell'ordinamento alfabetico.
