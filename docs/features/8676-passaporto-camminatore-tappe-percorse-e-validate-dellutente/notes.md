> Ticket: oc:8676

# Notes — Passaporto camminatore: tappe percorse e validate dell'utente

## Deviazioni dal piano

- **Ordinamento delle tappe.** Il piano diceva `localeCompare` con `{numeric: true}`. Così però
  «Tappa 09 Variante: …» finiva prima di «Tappa 09: …», perché nel confronto lo spazio viene prima
  dei due punti. Un primo tentativo con `ignorePunctuation` è stato scartato in review: ignora
  anche gli spazi, e l'ordine fra principale e variante dipendeva dalla parola che segue
  («Tappa 09: Zappa» dopo «Tappa 09 Variante: Macchie»). La chiave di ordinamento sostituisce i due
  punti con uno spazio e confronta con `{numeric: true}`.
- **Nome della tappa nel dettaglio.** L'overview diceva la pipe `wmtrans`. Il template usa invece
  `stageName()`: lingua corrente, poi italiano, poi la prima lingua disponibile. È lo stesso nome
  usato per ordinare, quindi ordine e testo mostrato non divergono.
- **Pagina della tappa.** Si chiama `wm-passport-stage-detail` e non `wm-passport-stage`, perché
  `.wm-passport-stage` è già la classe delle righe del dettaglio, con `ViewEncapsulation.None`.
- **Righe del dettaglio.** Sono diventate `button`, e le celle interne `span` al posto di `div`.

## Bug trovati

- **Dalla review finale: il valore di riserva passava da un utente all'altro.** L'ultimo progresso
  in memoria non si svuotava al logout. Un secondo utente sullo stesso dispositivo, con la prima
  lettura fallita, avrebbe visto le tappe del precedente. Ora il service lo svuota quando
  `isLogged` diventa falso.
- **Dalla review finale: richieste doppie nel dettaglio.** `progress$` stava dentro lo `switchMap`
  del refresh, quindi ogni rilettura risottoscriveva lo stream condiviso. Inoltre il ritorno da
  una tappa rileggeva tutto: scorrere 13 tappe faceva circa 26 richieste. Ora il dettaglio
  sottoscrive `progress$` una volta sola (con `defer`, perché `layerId` arriva dopo il
  costruttore). Al resume rilegge solo la certificazione. Tornando da una tappa non rilegge, e le
  righe hanno `trackBy`.
- **Dalla review finale: stato della riga invisibile allo screen reader.** Il ✓ è decorativo. Ora
  la riga ha un `aria-label` con nome e stato.

## Decisioni

- Le tappe `not_validatable` non esistono più: su richiesta del dev il backend conta tutte le tappe
  del cammino, chiunque ne sia il proprietario. Nova resta invariata.
- `name` e `distance` per tappa li manda il backend in `/progress`. L'app non ha l'elenco completo
  delle tappe del layer: le `hits` di elastic dipendono dalla ricerca in corso.
- Il campo `progress` c'è sempre. Una tappa `not_validated` con `progress` > 0 diventa
  `in_progress` (predisposizione per oc:8165).
- Le varianti contano nel totale: limite noto, rimandato a oc:8165 insieme alla regola di
  completamento.
- Il tab «Passaporto» del profilo (vista 5b), lo stato sulle card della home e lo stato nel
  dettaglio tappa della mappa sono usciti dal ciclo durante il dialogo.
- «Nessuna tappa registrata via GPS» è diventato «Nessuna tappa ancora riconosciuta». In questo
  punto il testo si discosta dalla vista V1 del wireframe.
- Le stime e i tag su Orchestrator sono stati saltati su richiesta del dev.

## Follow-up

- **La suite completa di wm-core non parte in locale.** Chrome headless si scollega (ping timeout)
  prima di eseguire qualunque test. Gli spec del passaporto girano con
  `--include='projects/wm-core/src/passport/**/*.spec.ts'` (116 verdi). Va verificato in CI se il
  problema c'era già prima di questo lavoro.
- `npm run test:single` non funziona più: usa `--single-run`, che l'Angular CLI attuale non accetta.
  Per i test serve Node ≥ 20.19.
- Minor della review, rimandati:
  - «Riprova» non ha uno stato di caricamento;
  - la pagina della tappa non si aggiorna se cambia la lingua mentre è aperta;
  - la distanza non usa il separatore decimale della lingua («19.5 Km»);
  - `source` non è validato.
- Da segnalare al cliente: molte tappe hanno distanza 0, e alcune distanze manuali sono
  probabilmente in metri (tappa 56 = 1500).
- Il wireframe su GitHub Pages va aggiornato con il testo nuovo della vista V1.
