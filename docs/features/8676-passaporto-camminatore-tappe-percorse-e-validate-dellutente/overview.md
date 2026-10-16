> Ticket: oc:8676

# Passaporto camminatore: tappe percorse e validate dell'utente (backend e app)

## Cosa cambia

Nell'istanza camminiditalia il passaporto smette di usare il progresso finto di oc:8166 e mostra le
tappe che il gestore ha davvero riconosciuto al camminatore. I dati vengono dal nuovo endpoint del
backend camminiditalia `GET /api/layer/{layer}/progress` (oc:8676, lato backend), autenticato con il
JWT dell'utente.

Diventano reali, senza cambiare la loro grafica:

- **badge e anello nella home del cammino** (vista 1 del wireframe): «46% completato · 6/13 tappe
  percorse» e l'anello intorno al logo;
- **dettaglio dal badge** (vista 2): «6 di 13 tappe», «Completa le restanti…», e la lista delle
  tappe con ✓ e data per quelle validate, numero e «—» per le altre.

Si aggiunge:

- **pagina della tappa nel passaporto** (vista 3): il tocco su una tappa della lista apre, dentro
  la modale del passaporto, una pagina nuova con il nome della tappa, lo stato («✓ percorsa il
  30 set» oppure «non ancora percorsa») e la distanza. È una pagina nuova, non il dettaglio tappa
  della mappa (`wm-track-properties`), che non viene toccato.

Dopo un'approvazione il dettaglio non rimanda più all'email per sapere quali tappe sono state
riconosciute: le tappe sono a schermo.

Riferimento grafico: wireframe <https://webmappsrl.github.io/webmapp-app/index.html>, viste 1, 2 e 3.

## Perché

Il gestore riconosce le tappe in Nova da oc:8653/oc:8671, ma l'app non lo sa: il progresso è un
mock (`passport.service.ts:55-57`, `:94-99`, `:235`) che inventa i nomi («Tappa 01») e decide le
tappe percorse con `layerId % 3`. Dopo un'approvazione badge, anello e lista restano uguali, e il
dettaglio rimanda all'email (knowledge 8166, righe 50-52). Il backend ora espone le tappe validate,
e il frontend era stato costruito apposta per cambiare solo `getProgress`.

## Contratto del backend (stato al 01/10/2026)

`GET /api/layer/{layer}/progress`, `auth:api`, sempre per l'utente loggato. 401 senza token, 404 per
un layer che non esiste o con un id non numerico. Nessun altro errore.

```json
{"layer_id":40,"validated":6,"total":13,"percentage":46,"completed":false,
 "km_validated":39.5,"km_total":105.0,
 "tracks":[{"id":203,"name":{"it":"Cammino Grande di Celestino - Tappa 06: Pacentro - Caramanico Terme"},
            "distance":19.5,"status":"validated","validated_at":"2026-09-30T14:45:55+00:00","source":"manual"},
           {"id":215,"name":{"it":"…"},"distance":0.0,"status":"not_validated","validated_at":null,"source":null}]}
```

- `tracks` contiene **tutte** le tappe associate al cammino, ordinate per id. Ogni tappa conta,
  chiunque ne sia il proprietario: `status` è solo `validated` o `not_validated`.
- La validazione vale per tappa: una tappa validata risulta `validated` in tutti i cammini che la
  contengono.
- `name` è un oggetto di traduzioni (`{}` se manca). `distance` è in km con un decimale, e molte
  tappe valgono `0.0` perché la distanza manca nei dati.
- `validated_at` è in UTC ed è il momento in cui il gestore ha approvato in Nova.
- `percentage` è intero troncato. `completed` è calcolato al momento e torna `false` se il gestore
  aggiunge una tappa.
- `progress` (0-100) c'è sempre in ogni tappa: oggi vale 100 per le tappe validate e 0 per le
  altre. Con il GPS di oc:8165 potrà avere valori intermedi mentre `status` resta `not_validated`.
  Il completamento si legge da `status`, e i totali contano solo le tappe validate.
- Regola di evoluzione: solo campi nuovi, mai rinominati né rimossi. Il frontend ignora i campi che
  non conosce.

## Requisiti

- [ ] `PassportService.getProgress(layerId)` chiama `GET ${origin}/api/layer/{layerId}/progress`
      con `HttpClient`, come `getCertification`. JWT e `App-id` li aggiunge `AuthInterceptor`. Il
      mock (`_mockProgress`, `MOCK_LATENCY_MS`, la dipendenza da `layerFeaturesTotalCount`) e
      l'avviso «⚠️ MOCK» nel commento della classe vengono rimossi.
- [ ] La risposta viene convertita nel tipo `PassportProgress` di `wm-types`:
      `total → totalStages`, `validated → completedStages`, `percentage → percent`, `tracks →
      stages`, `validated → completed`, `not_validated → not_started`,
      `validated_at → completedAt`. Per ogni tappa si aggiungono `distance` e `source`. Uno stato
      sconosciuto diventa `not_started`. Badge, anello e dettaglio vedono gli stessi numeri del
      backend: niente ricalcolo lato app. Anche il «completato» del dettaglio si legge dal campo
      `completed` del backend, non da `percent === 100`.
- [ ] Predisposizione per oc:8165: una tappa `not_validated` con `progress` > 0 diventa
      `in_progress` con `percent = progress`. Se il campo manca vale come 0. Il completamento si
      decide solo da `status`, mai da `progress`.
- [ ] `name` della tappa resta l'oggetto di traduzioni e si mostra con la pipe `wmtrans`, come il
      titolo del layer.
- [ ] Nella lista del dettaglio (vista 2) le tappe sono ordinate per nome tradotto, con confronto
      naturale (`localeCompare` con `{numeric: true}`): «Tappa 02» prima di «Tappa 10», e «Tappa 09
      Variante» accanto alla 09. Il numero mostrato per le tappe non percorse segue questo ordine.
      L'ordinamento si fa nel componente e si ricalcola al cambio lingua. Le tappe con `name` vuoto
      vanno in fondo.
- [ ] La data delle tappe percorse si mostra con la dicitura del wireframe: «12 mag» nella lista,
      «✓ percorsa il 12 mag» nella pagina della tappa. Si formatta nel fuso del dispositivo, a
      partire da `validated_at` in UTC.
- [ ] Il tocco su una tappa della lista apre la **pagina della tappa** (nuovo componente nel
      passaporto) con `nav.push` nell'`ion-nav` della modale, come il form. Mostra nome, chip di
      stato e distanza. Il «←» torna al dettaglio. Niente bottone «Condividi».
- [ ] La distanza `0.0` non si mostra come «0.0 Km»: la riga della distanza resta nascosta.
- [ ] Dopo un'approvazione la frase «Le tappe riconosciute sono elencate nell'email che ti abbiamo
      inviato.» non compare più. Dopo un rifiuto la frase sul motivo nell'email resta com'è.
- [ ] Il service espone, per ogni layer, uno stream di progresso condiviso (`shareReplay` con
      `refCount`): badge e anello fanno una sola richiesta e restano autonomi come oggi, senza
      toccare la variante `home-layer.camminiditalia`.
- [ ] Lo stream si rilegge all'apertura della home del cammino, al ritorno dell'app in primo piano
      (`appResume$`), alla chiusura della modale del passaporto e a ogni rilettura del dettaglio,
      compresa quella che segue un'approvazione. Così home e dettaglio mostrano sempre lo stesso
      numero. Niente polling.
- [ ] Il service tiene in memoria, per la durata della sessione, l'ultimo progresso letto per ogni
      layer. Se una lettura fallisce (offline, 5xx, timeout) si mostra quello. Se il dato non è mai
      stato letto, badge e anello restano nascosti. Niente cache persistente, niente localStorage.
- [ ] Nel dettaglio il `catchError` del progresso sta sulla singola rilettura, come per la
      certificazione, e un errore non chiude mai `vm$`. Se fallisce una rilettura resta il progresso
      precedente. Se fallisce la prima e non c'è un valore in memoria, al posto della lista compare
      «Impossibile caricare le tappe» con il bottone «Riprova». Anello e testata restano vuoti, e la
      zona della certificazione funziona come oggi.
- [ ] Con 0 tappe riconosciute la testata del dettaglio mostra «Nessuna tappa ancora riconosciuta»
      al posto di «Nessuna tappa registrata via GPS». Il testo si discosta dalla vista V1 del
      wireframe.
- [ ] Testi nuovi in tutte le lingue di wm-core (it, en, de, fr, es, pr, sq), con la chiave uguale al
      testo italiano, ripetuto come valore anche in `it.ts`.
- [ ] [UX] Lo stato di ogni tappa ha icona e testo, non solo il colore. Il chip ha contrasto
      ≥ 4.5:1.
- [ ] [UX] Ogni riga della lista è un'area di tocco di almeno 44 px di altezza, con un feedback
      visivo al tocco.
- [ ] [UX] I nomi lunghi («Cammino Grande di Celestino - Tappa 09 Variante: Macchie di Coco -
      Serramonacesca») vanno a capo nella pagina della tappa e non spingono fuori la data nella
      lista.
- [ ] Test unitari del service con i JSON reali del backend come fixture: layer 40 (6/13), layer 63
      (0/3, distanze 0), layer 30 (`total` 0, `tracks` vuoto). Coprono conversione, ordinamento
      naturale, `name` `{}`, stato sconosciuto, errore HTTP. I test della pagina della tappa coprono
      i due stati e la distanza nascosta.
- [ ] Prova manuale prima del commit con l'app in locale contro il backend camminiditalia locale
      (`127.0.0.1:8000`) e un utente di test con validazioni. Si usano le modifiche locali già
      presenti in `core/src/environments/environment.ts` (`shardName: 'local'`) e in
      `wm-types/src/environment.ts` (shard `local` verso camminiditalia): non si toccano e non si
      committano. I commit aggiungono i file per nome, mai `-A`, e prima di ogni commit si controlla
      che nessun `environment.ts` sia nello staged.

## Rischi

- **La data mostrata è quella dell'approvazione, non della percorrenza.** Con la credenziale
  cartacea tutte le tappe di una richiesta hanno la stessa data, il giorno in cui il gestore ha
  approvato. Il wireframe chiede «percorsa il …» e si segue il wireframe. Con il GPS di oc:8165 le
  due date coincideranno.
- **Il backend non è ancora committato né deployato.** I nomi dei campi vengono dal working tree
  del branch backend di oc:8676. Fino al deploy il passaporto funziona solo contro il backend
  locale. Mitigazione: il lavoro resta sul branch `Passaporto`, unito al resto solo con il backend.
- **Sugli altri shard la rotta non esiste.** Il passaporto è montato solo dalla variante
  `.camminiditalia` di `home-layer`, quindi altrove `getProgress` non viene mai chiamato. La
  pagina nuova sta dentro la modale del passaporto e non cambia questo confine.
- **Dati sporchi del cliente:** molte tappe hanno distanza 0, e alcune distanze manuali sono
  probabilmente in metri (tappa 56 = 1500). L'app non corregge nulla: nasconde solo lo 0. Va
  segnalato al cliente.
- **L'ordine per nome dipende dai nomi.** Se un cammino ha nomi senza «Tappa NN», l'ordine diventa
  alfabetico. Accettato: il backend non ha un ordine di percorrenza (`layerables` senza campo di
  ordine).
- **Le varianti contano nel totale.** Nel layer 40 la «Tappa 09 Variante» (id 712) sta accanto alla
  «Tappa 09» (id 489) e conta in `total`: chi percorre il tracciato principale si ferma a 12/13 e
  il cammino non risulta mai completato. Limite noto e accettato: la regola sulle varianti e sul
  completamento è rimandata a oc:8165, dove `total` e `completed` potranno cambiare significato. Il
  frontend mostra i numeri che riceve e non costruisce logiche proprie sulle varianti.
- **`in_progress` con valori intermedi non è ancora visibile nei dati reali.** Oggi `progress`
  vale solo 0 o 100. Il caso intermedio si prova con una fixture modificata a mano, finché oc:8165
  non lo produce davvero.
- **Due `environment.ts` modificati in locale** possono finire in un commit per sbaglio, uno dei
  due proprio in `wm-types`, che questo lavoro tocca. Mitigato aggiungendo i file per nome e
  controllando lo staged prima di ogni commit.

## Out of scope

- Il tab «Passaporto» del profilo (vista 5b) e quindi l'uso di `GET /api/passport`.
- Lo stato su ogni card della lista tappe della home del cammino (vista 1, «✓ percorsa il …» dentro
  `wm-search-box`).
- Lo stato nel dettaglio tappa esistente della mappa (`wm-track-properties`): arriverà con un
  ticket futuro.
- Il bottone «Condividi» della pagina della tappa e le viste di condivisione e di completamento
  (4, 6, 7).
- Badge, percentuali parziali e validazione automatica da GPS (oc:8165).

## Moduli toccati

Tutti i percorsi sono relativi a `projects/wm-core/src/` in wm-core, salvo dove indicato.

- `wm-types` → `src/passport.ts`: `PassportStage` con `name` tradotto, `distance` e `source`.
  Vedi l'overview gemella in wm-types.
- `passport/passport.service.ts` e `passport.service.spec.ts`: chiamata vera, conversione, una sola
  richiesta per badge e anello, errori. Fixture JSON del backend accanto allo spec.
- `passport/passport.utils.ts`: ordinamento naturale delle tappe e formattazione della data.
- `passport/passport-detail/passport-detail.component.{ts,html,scss}` e `.spec.ts`: lista ordinata e
  cliccabile, nome tradotto, niente frase sull'email dopo un'approvazione.
- `passport/passport-stage-detail/` (nuovo): pagina della tappa, con spec. Il nome evita la classe `.wm-passport-stage` già usata dalle righe del dettaglio, con `ViewEncapsulation.None`.
- `passport/passport-modal/passport-modal.component.ts`: `openStage()`, accanto a `openForm()`.
- `wm-core.module.ts`: dichiarazione del componente nuovo.
- `localization/i18n/{it,en,de,fr,es,pr,sq}.ts`: testi nuovi.
- `webmapp-app` (repo principale): solo l'aggiornamento dei puntatori ai submodule.
- `wm-webapp`: riceve la modifica con lo stesso aggiornamento di `wm-core` e `wm-types`, da fare
  insieme. Non fa parte di questo ciclo.
