> Ticket: oc:8583

# Bug: titoli dei box informativi in blu invece che neri su iOS

## Cosa cambia

Il bottone che fa da titolo/header di un box informativo (`wm-config-detail`) riceve un colore di
testo esplicito e un reset di `-webkit-appearance`, così il titolo appare nero su tutte le
piattaforme — non solo su Android/web come oggi.

## Perché

Durante il collaudo, Davide e Gianluca hanno segnalato che i titoli dei box informativi (es.
"Storia", "Segnaletica") appaiono in blu su iOS mentre sono neri su Android e sul sito web.

Verificato nel codice: `.wm-config-detail-header` (il `<button>` in
`config-detail.component.html`, che contiene `<span class="wm-config-detail-title">` col testo)
non ha mai un `color` esplicito né un reset `-webkit-appearance`. Il testo del titolo eredita il
colore dal bottone padre. Il comportamento è coerente col default WebKit/iOS, che colora di blu
gli elementi interattivi (bottoni, link) non completamente stilizzati — Chromium/Android non lo
fa. Nessuna causa nel backend: il campo Nova per il titolo del box informativo è testo semplice,
senza colore.

## Requisiti

- [ ] Aggiungere `color: var(--wm-color-dark, #1a1a1a)` e `-webkit-appearance: none` alla regola
      `.wm-config-detail-header` in `config-detail.component.scss` (il fix va sul bottone padre,
      non va duplicato su `.wm-config-detail-title`, che eredita il colore)
- [ ] Verificare visivamente su un device/simulatore iOS reale che il titolo appaia nero
      (nessun ambiente iOS disponibile in questa sessione di pianificazione — verifica rimandata
      a chi implementa/testa)
- [ ] Verificare che il fix non alteri la resa già corretta su Android/web

## Rischi

Il componente è condiviso in `wm-core`: il fix si applica automaticamente a tutte le app Webmapp
che lo usano (montato sia da `webmapp-app` che da `wm-webapp`), non solo a Cammini d'Italia —
effetto collaterale positivo accettato esplicitamente dal dev, non un rischio.

Nessuna verifica automatica possibile in questa sessione (nessun ambiente iOS): la chiusura del
ticket dipende da una verifica manuale successiva.

## Out of scope

Audit di altri componenti `wm-core` con lo stesso pattern (bottone senza reset di stile) — scope
limitato esplicitamente a `wm-config-detail`, su richiesta del dev. Nessuna priorità assegnata al
ticket, su richiesta esplicita del dev.

## Moduli toccati

`wm-core` → `projects/wm-core/src/config-detail/config-detail.component.scss` (montato da
`webmapp-app` in `core/src/app/shared/wm-core/`)
