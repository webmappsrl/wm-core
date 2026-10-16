> Ticket: oc:8741

# App: le UGC cancellate sul server restano visibili sul telefono fino al logout

Tutto il codice è in `wm-core`. In `webmapp-app` cambia solo il puntatore al submodule.

## Cosa cambia

Dopo ogni scaricamento riuscito delle UGC dal server (`_fetchUgcTracks()` e `_fetchUgcPois()` in
`store/features/ugc/ugc.service.ts`), l'app **toglie dal telefono le UGC sincronizzate il cui `id`
il server non restituisce più**, per le tracce e per i POI. Toglie anche le loro immagini salvate in
locale, **solo quelle che nessuna UGC rimasta usa più**.

Il telefono rispecchia l'elenco del server: se il server restituisce ancora due UGC con lo stesso
uuid e id diversi, il telefono le tiene tutte e due. La deduplica è un compito del server (oc:8718).

La logica sta in **una funzione pura generica**, usata da entrambi i fetch: riceve l'elenco del
server e quello locale sincronizzato, e restituisce le UGC da togliere e gli URL delle immagini da
cancellare. La rimozione vera da localForage la fanno i due fetch.

Lo store NgRx non cambia: dopo il sync `syncUgcSuccess` ricarica già le liste da localForage
(`loadUgcTracks$`/`loadUgcPois$` → `getUgcTracks()`/`getUgcPois()`), quindi una UGC tolta da
localForage sparisce dalla lista entro il sync successivo, cioè al massimo dopo circa 60 secondi.

## Perché

Il command `wm:fix-duplicated-ugc` di oc:8718 ha unito sul server di dev di camminiditalia le
tracce duplicate dell'utente 3680 (133 ← 134, 135; 140 ← 141; 143 ← 144; 145 ← 146), ma il
telefono di chi le aveva già scaricate continua a mostrare le copie, perché il fetch aggiunge e
aggiorna e non toglie mai niente. Stesso effetto per ogni UGC cancellata da un amministratore in
Nova. Oggi una UGC sincronizzata sparisce solo al logout o tentando di modificarla (ramo del 404 in
`ugc.effects.ts`).

Allo scrum del 08/10 (call delle 09:35) il problema è stato riconosciuto e si è deciso che il fix
entra nella prossima release, come parte del pacchetto passaporto. Il cliente lo vedrebbe come un
difetto nostro durante il collaudo.

## Requisiti

- [ ] Una funzione pura generica, valida per tracce e POI, che dati l'elenco del server e l'elenco
      locale sincronizzato restituisce le UGC locali da togliere, cioè quelle il cui
      `properties.id` non compare fra gli id del server.
- [ ] La stessa funzione restituisce gli URL delle immagini da cancellare: quelli delle UGC tolte
      che non compaiono fra le immagini delle UGC sincronizzate rimaste, tracce **e** POI, perché
      la memoria `synchronizedImg` è una sola per entrambi.
- [ ] `_fetchUgcTracks()` e `_fetchUgcPois()` applicano la riconciliazione dopo il ciclo di
      salvataggio esistente, rimuovendo da `synchronizedUgcTrack`/`synchronizedUgcPoi` e da
      `synchronizedImg`.
- [ ] Se lo scaricamento fallisce (`null`, per errore HTTP o rete assente) non si tocca nulla, come
      oggi. Un `null` non deve mai essere trattato come elenco vuoto.
- [ ] La coda `device` (UGC non ancora inviate) non viene mai toccata.
- [ ] Nessuna deduplica per uuid: due UGC del server con lo stesso uuid restano entrambe.
- [ ] Test unitari Jasmine sulla funzione pura: UGC non più sul server tolta; elenco del server
      completo, nessuna rimozione; immagine condivisa con una UGC rimasta non cancellata; elenco
      del server vuoto ma valido, tutte le sincronizzate tolte; due UGC del server con lo stesso
      uuid, entrambe tenute.
- [ ] Test unitario sul fetch: con `_getApiTracks()`/`_getApiPois()` che restituiscono `null`,
      nessuna rimozione.
- [ ] Se fra le UGC tolte c'è quella aperta (`currentUgcTrack`/`currentUgcPoi`), il pannello di
      dettaglio si chiude: `currentUgcTrackId`/`currentUgcPoiId` a `null` e parametro
      `ugc_track`/`ugc_poi` tolto dall'URL. Altrimenti al cambio successivo dei query param
      `getUgcTrack()`/`getUgcPoi()` ripiegherebbero sull'ultima UGC sincronizzata e il pannello
      mostrerebbe un'altra UGC senza avviso.
- [ ] Gli id si confrontano normalizzati a stringa da entrambe le parti; un elenco del server senza
      `features` array conta come fallimento, non come elenco vuoto.
- [ ] Le immagini di una UGC si leggono da `properties.media[].webPath`, lo stesso criterio con cui
      le salva `saveUgcImagesByStorage`. Si toglie prima la UGC, poi le sue immagini.
- [ ] Collaudo manuale sul server di dev di camminiditalia con l'utente 3680. Il command di oc:8718
      è già stato lanciato lì, quindi: (1) si ricarica sul dev un dump antecedente al command;
      (2) login dall'app collegata al dev, i doppioni si vedono; (3) si rilancia il command;
      (4) senza logout, entro il sync successivo resta una sola copia. In più: una UGC di prova
      cancellata da Nova sparisce dal telefono.

## Rischi

- **Elenco del server incompleto.** La riconciliazione presuppone che `index` restituisca tutte le
  UGC dell'utente. Oggi `UgcController::index()` in wm-package non pagina. Se un giorno venisse
  paginato, la riconciliazione cancellerebbe dal telefono le UGC delle pagine non scaricate (le
  riscaricherebbe al giro dopo, ma sparirebbero alla vista). Lo segnala un commento nel codice.
- **Rete assente o errore.** Coperto: `_getApiTracks()`/`_getApiPois()` trasformano ogni errore in
  `null` e il fetch esce prima della riconciliazione. Un test lo fissa.
- **Storage condiviso fra app sulla stessa origine.** Il DB localForage `synchronized` non ha
  l'app-id nel nome, e l'index è filtrato per `App-id`. In produzione ogni app ha il proprio
  hostname (`<appId>.<shard>…`, `EnvironmentService`), quindi un'origine propria. Su `localhost`,
  cambiando `appId` in `environment.ts`, la riconciliazione toglierebbe le UGC sincronizzate
  dell'altra app: sono solo copie del server e tornano al cambio successivo. Accettato.
- **Immagini condivise fra UGC.** Dopo l'unione di oc:8718 la UGC tenuta può avere le stesse foto
  di quella tolta, con gli stessi URL. Coperto: si cancellano solo gli URL che nessuna UGC
  rimasta usa.
- **UGC tolta mentre è aperta.** `url-handler.service.ts` rilancia `currentUgcTrackId` a ogni
  cambio dei query param, e `getUgcTrack()` (`localForage.ts`, `a ?? b ?? c`) ripiega
  sull'ultima traccia sincronizzata se l'id non esiste più: il pannello mostrerebbe un'altra
  traccia. Coperto chiudendo il pannello quando la UGC aperta viene tolta. Il ripiego resta com'è.
- **Il comportamento non si spegne da remoto.** Passa da «aggiungi e aggiorna» a «rispecchia il
  server»: un errore del server che sfoltisce l'index si propaga ai telefoni. Accettato: l'unica
  leva è correggere il server, e le UGC tornano finché esistono lì.
- **Arriva anche a `wm-webapp`** al prossimo aggiornamento del submodule, con lo stesso
  comportamento. Ogni webapp ha la propria origine, quindi la propria memoria del browser.

## Out of scope

- Salvare l'`id` restituito dal server subito dopo una store riuscita: non necessario dopo oc:8718,
  che rende la store idempotente per uuid lato server.
- Scaricamento incrementale (non riscaricare ogni volta tutte le UGC): rinviato in call il 08/10.
- Modifiche lato server.
- Il ramo del 404 in update, che toglie la UGC senza le immagini: resta com'è.

## Moduli toccati

Tutti in `wm-core` (`projects/wm-core/src/`):

- `store/features/ugc/ugc.service.ts`: `_fetchUgcTracks()`, `_fetchUgcPois()`.
- Un file nuovo per la funzione pura di riconciliazione, accanto al service
  (`store/features/ugc/ugc-reconcile.ts`), con il suo spec.
- `utils/localForage.ts`: eventuale funzione di supporto per leggere gli URL delle immagini o per
  rimuoverne un elenco, se quelle esistenti (`findImgInsideProperties`, `removeImg`) non bastano.
- `store/features/ugc/ugc.service.spec.ts`: test del fetch con `null`.
- La chiusura del pannello della UGC aperta: punto esatto (service, effect su `syncUgcSuccess` o
  `UrlHandlerService`) da definire nel piano.

In `webmapp-app`: solo l'aggiornamento del puntatore al submodule `wm-core`.
