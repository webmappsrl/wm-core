> Ticket: oc:8583

# Notes — Bug: titoli dei box informativi in blu invece che neri su iOS

## Deviazioni dal piano

Nessuna deviazione rilevante.

## Bug trovati

Nessuno.

## Decisioni

- Fallback esplicito `var(--wm-color-dark, #323031)` invece della sola `var(--wm-color-dark)`
  indicata nel ticket originale — scelto per coerenza con `home-route-filter-row.component.scss`.
  Il valore `#1a1a1a` inizialmente proposto è stato corretto in `#323031` durante la review
  formale (`wm-review-ticket`), perché non corrispondeva al valore reale della variabile
  (`core/src/theme/variables.scss:24`). Confermato dal dev.
- Challenge eseguita inline dal dev/assistente invece che con subagente adversariale dedicato, e
  piano scritto direttamente senza invocare `superpowers:writing-plans` — fix a un file singolo,
  una riga, già completamente descritto nel ticket.
- Review formale (`wm-skills:wm-review-ticket`) eseguita prima del commit, con 5 finder paralleli
  sul diff non ancora committato (nessuna PR aperta al momento della review). Verdetto: approvato,
  nessun bloccante. Applicati 2 cleanup: fallback CSS corretto (vedi sopra) e riordino delle
  proprietà `color`/`-webkit-appearance` accanto a `border: none` in `.wm-config-detail-header`
  per coerenza con `.wm-config-detail-toggle-button`. Un terzo rilievo (estrarre un mixin
  condiviso per il reset dei bottoni non stilizzati su iOS/WebKit) è stato rimandato: non
  giustificato per un fix di un solo componente, da rivalutare se il pattern si ripete altrove.

- Aggiunta `appearance: none;` (proprietà standard, non solo il prefisso `-webkit-`) su
  `.wm-config-detail-header` in seguito a un avviso del linter dell'IDE emerso dopo la review
  formale, non incluso nel piano originale.

## Follow-up

Nessuno. Verifica visiva su device/simulatore iOS resta da fare da chi la esegue (nessun ambiente
iOS disponibile in questa sessione).
