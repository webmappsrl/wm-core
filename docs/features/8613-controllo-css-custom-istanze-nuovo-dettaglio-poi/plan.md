> Ticket: oc:8613

# Piano

Ricostruito a lavoro concluso, limitato a ciò che è successo in **questo repo**. Il piano completo
del ticket sta nei due prodotti, che sono quelli da cui il lavoro è stato guidato.

## 1 — Ricevere i nove temi — ✅

Da `wm-webapp/src/theme/` (sei file) e `webmapp-app/core/src/theme/` (tre), insiemi disgiunti.
Spostati verbatim: md5 verificato uno per uno prima e dopo. Più un `README.md` accanto ai file,
perché una cartella di CSS dentro una libreria Angular non si spiega da sé.

## 2 — La guardia sulla build — ✅

`scripts/check-themes.js`, invocato dai due consumer con lo stesso percorso relativo. Cerca i temi
rispetto a sé stesso e non al cwd, così funziona da qualunque directory.

## 3 — Lo slot `[bottom]` di `wm-track-properties` — ✅

`order: 100`, perché un figlio flex senza `order` vale 0 e un tema che numera le sezioni lo
manderebbe in cima. Il sintomo era il pulsante «Modifica» sopra l'intestazione del percorso.

## 4 — Le regole rese condivise — ✅

Nel tema dell'app 75, le regole scopate al contenitore dell'app hanno preso un secondo selettore
per il contenitore della webapp, **affiancato e non sostituito**: nove selettori distinti, dieci
occorrenze, due blocchi poi uniti.

## 5 — Documentazione — ✅

`docs/knowledge/varianti-per-shard.md` è la pagina canonica sul meccanismo; le pagine dei due
prodotti rimandano a lei e tengono solo ciò che è del proprio prodotto.

## 6 — Correzioni dalla review interna — ✅

Fatte a fine ciclo, dopo che la review ha rimesso in discussione parte del punto 4. Stanno tutte in
`notes.md`.

## Non fatto, di proposito

Una font unica condivisa fra i due prodotti; un meccanismo che tolga la duplicazione dei sei file
di tema identici. Le ragioni sono in `notes.md` e nel `README.md` accanto ai file.
