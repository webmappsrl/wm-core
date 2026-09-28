> Ticket: oc:8613

# Overview

Correlato a **oc:8406**, che ha unificato il dettaglio POI. Questo cantiere copre **la parte di
`wm-core`**: il prodotto che ha chiesto il lavoro è la webapp, ma i file sono finiti qui, e questo
repo non aveva traccia di un lavoro che gli ha portato dentro nove CSS di clienti, uno script di
build e una modifica a un componente.

## Cosa chiedeva il ticket

Dallo scrum del 21/09/2026, Giuseppe Bonfanti: «devi vedere quelli che hanno il CSS arcodato se si
rompe qualcosa prima di andare», «probabilmente vanno aggiornate le classi», «se andiamo in
produzione con sta roba sulla web app senza aver rivisto i CSS si spacca tutto».

Cioè: verificare che oc:8406, riscrivendo il markup del dettaglio POI, non avesse scollegato le
personalizzazioni CSS per istanza.

## Cosa è cambiato qui

- **I nove fogli per app vivono in `projects/wm-core/src/assets/theme/<shard>/<appId>.css`.**
  Prima ogni prodotto teneva i propri — `wm-webapp/src/theme/` e `webmapp-app/core/src/theme/` —
  in insiemi **disgiunti**: la stessa app poteva avere il suo CSS da una parte sola, ed è
  esattamente come i due prodotti sono arrivati a rendere lo stesso dettaglio in modo diverso.
- **`scripts/check-themes.js`**: la guardia che ferma la build quando i temi mancano o sono
  incompleti. Sta qui e non nei due prodotti perché il problema è di questo repo — è da qui che i
  file possono mancare — e perché una copia per prodotto avrebbe creato il terzo caso di file
  gemelli dopo `serve.js` e `lib/run.js`.
- **`track-properties.component.scss`**: lo slot `[bottom]` ha un `order` esplicito. Il
  contenitore è flex e un figlio senza `order` vale 0, quindi bastava un tema che numerasse le
  sezioni perché il contenuto proiettato in fondo finisse in cima.

## Perché i temi stanno qui

L'invariante è **«la stessa app si vede allo stesso modo sui due prodotti»**, ed è una proprietà
dell'app, non di chi la serve. Con due insiemi disgiunti nessun meccanismo poteva accorgersi di una
divergenza: Ville e Giardini Medicei (75) aveva il suo tema solo sull'app, e nessuno lo sapeva.

Il costo va nominato: aggiungere un cliente adesso è un commit qui più un bump del pin in due
prodotti, cioè il ciclo di rilascio di una libreria applicato a una consegna. Con sei clienti è
sostenibile; la contropartita è che le divergenze smettono di essere invisibili.

## Out of scope

- Il dominio del dettaglio POI, che è di oc:8406.
- Il ramo UGC, rinviato a un ticket dedicato.
- Una font unica condivisa fra i due prodotti: vedi `notes.md`.

## Moduli toccati

`projects/wm-core/src/assets/theme/` (nove file più il README), `scripts/check-themes.js`,
`projects/wm-core/src/track-properties/track-properties.component.scss`,
`docs/knowledge/varianti-per-shard.md`, `CLAUDE.md`, `.claude/rules/css-per-istanza.md`.

Sotto la review interna di fine ciclo si sono aggiunti `projects/wm-core/src/phone/split-phones.ts`,
`projects/wm-core/src/address/maps-href.ts`, `projects/wm-core/src/address/address.component.ts`,
`projects/wm-core/src/related-urls/related-urls.component.ts`,
`projects/wm-core/src/image-detail/image-detail-presentation.ts`,
`projects/wm-core/src/image-gallery/image-gallery.component.ts` e quattro spec: vedi `notes.md`.
