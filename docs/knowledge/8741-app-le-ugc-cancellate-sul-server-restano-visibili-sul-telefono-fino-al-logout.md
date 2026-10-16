# UGC sincronizzate: cosa resta sul telefono

## Come funziona oggi

Il sync delle UGC (`UgcService.syncUgc()`, ogni 60 s con `syncOnInterval$`, dopo login/logout e
dopo salvataggio, modifica o cancellazione) passa da una coda unica, `syncQueue`: per ogni tipo
prima il push della coda `device`, poi lo scaricamento dell'index del server. Le operazioni non
si sovrappongono mai.

**Il telefono rispecchia l'elenco del server** (oc:8741). Dopo lo scaricamento,
`_reconcileUgc()` toglie dalla memoria `synchronized` le UGC il cui id il server non restituisce
più, per tracce e POI, poi le loro immagini in `synchronizedImg` che nessuna UGC rimasta usa,
e lancia `removedSynchronizedUgc({ugcType, ids})`. `UgcEffects.closeRemovedCurrentUgc$` chiude il
pannello di dettaglio se la UGC aperta è fra quelle tolte. Lo store si riallinea da solo:
`syncUgcSuccess` ricarica le liste da localForage.

Vincoli:
- **L'index del server deve restituire tutte le UGC dell'utente.** `UgcController::index()` in
  wm-package oggi non pagina. Se diventa paginato o filtrato, la riconciliazione cancella dai
  telefoni le UGC escluse.
- **Un fetch fallito non tocca nulla**: ogni errore HTTP diventa `null`, e anche una risposta
  senza `features` array conta come fallimento, mai come elenco vuoto.
- **La coda `device` non si tocca mai**: contiene le UGC non ancora inviate.
- **Il confronto è solo per id, come stringa**: due UGC del server con lo stesso uuid restano
  entrambe. La deduplica è un compito del server.
- **Le immagini si leggono da `media[].webPath`** con `getUgcMediaUrls()` in
  `utils/localForage.ts`, la stessa funzione che usa il salvataggio.
- **Arriva anche a `wm-webapp`**, con lo stesso comportamento: ogni webapp ha la propria origine,
  quindi la propria memoria del browser.

## Perché così

- **Riconciliazione per id, non per uuid** (oc:8741): dopo l'unione dei doppioni di oc:8718 il
  server restituisce solo la 133 e il telefono ha 133, 134, 135 con lo stesso uuid. Per uuid le
  copie resterebbero tutte. Deduplicare sul telefono, invece, nasconderebbe un'incoerenza del
  server e dovrebbe scegliere a caso quale copia tenere.
- **Si cancellano solo le immagini non più usate da nessuna UGC rimasta, tracce e POI**
  (oc:8741): la UGC tenuta dopo un'unione può avere le stesse foto, con gli stessi URL, di quella
  tolta. Se la lettura dell'altro tipo fallisce non si cancella nulla: un'immagine orfana costa
  meno di una foto offline persa.
- **Una rimozione fallita non viene notificata** (oc:8741): `removeSynchronizedUgcTrack/Poi`
  restituiscono `boolean`, così una UGC rimasta in memoria non perde le immagini e il suo
  pannello non si chiude.
- **La chiusura del pannello è in un effect, non nel service** (oc:8741): `UgcService` è il
  service dati del feature store, e nel layer store di wm-core solo gli effect navigano. Con
  l'action la chiusura si vede anche nei DevTools di NgRx.
- **Gli helper della riconciliazione sono metodi privati del service** (oc:8741), come
  `_isFeatureModified`: è la convenzione del modulo UGC, testata con `(service as any)._metodo(...)`.
- **Una lettura per tipo a ogni sync** (oc:8741): la riconciliazione riceve la lista già letta dal
  fetch e legge l'altro tipo solo se le UGC tolte hanno immagini. Le UGC salvate durante il
  ciclo sono fra quelle del server, quindi non vanno tolte e le loro immagini sono già protette.

## Come ci siamo arrivati

- **Prima di oc:8741 il fetch aggiungeva e aggiornava, ma non toglieva mai**: le UGC cancellate
  sul server (doppioni uniti, rimozioni da Nova) restavano visibili fino al logout, o finché una
  modifica non riceveva 404.

## Debito noto

- **`getUgcTrack()`/`getUgcPoi()` ripiegano sull'ultima UGC sincronizzata** se l'id richiesto non
  esiste (`a ?? b ?? c` in `localForage.ts`): una UGC sparita lascia il pannello su un'altra UGC.
  oc:8741 copre il sintomo chiudendo il pannello, come fa a modo suo il ramo del 404 in update.
  Resta una finestra di pochi secondi, fra la riconciliazione dei POI e il ricaricamento della
  lista a fine sync, in cui toccare un POI appena tolto apre un altro POI.
