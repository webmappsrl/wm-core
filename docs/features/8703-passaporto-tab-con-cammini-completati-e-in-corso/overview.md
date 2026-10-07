> Ticket: oc:8703

# Passaporto: tab con cammini completati e in corso

Parte `wm-core` del lavoro. L'insieme (tab bar, pagina del tab, varianti di shard) è descritto in
`webmapp-app/docs/features/8703-passaporto-tab-con-cammini-completati-e-in-corso/overview.md`.

## Cosa cambia

Due cose nel dominio del passaporto (`projects/wm-core/src/passport/`):

1. **Un componente nuovo, il passaporto a timbri**, montato dalla pagina del tab Passaporto
   dell'app: una griglia con tutti i cammini della config, ciascuno col logo nell'anello di
   avanzamento — prima gli in corso, poi i completati, poi i non iniziati in grigio — con stato di
   caricamento ed errore. Toccando un timbro, anche grigio, apre la modale del dettaglio esistente.
2. **Il dettaglio del cammino (`passport-detail`) ha uno stato «completato»** che riproduce la
   vista 6 del wireframe: testata di celebrazione, «Completato il <data>», caselle km e tappe,
   «Condividi il traguardo», lista delle tappe chiusa ma apribile. Vale da qualunque punto si apra
   il dettaglio: dal tab Passaporto e dal riquadro verde della home del layer.

## Perché

Il passaporto diventa una voce della tab bar (richiesta del cliente, scrum del 06/10). Il passaporto a timbri e
il dettaglio sono dominio del passaporto, già tutto in `wm-core`: qui si riusano gli stream
condivisi di `PassportService` invece di duplicarli nell'app. Vista 2 e vista 6 sono la stessa
schermata in due stati, così il traguardo si vede uguale da ogni ingresso.

## Requisiti

**Passaporto a timbri**
- [ ] Parte da **tutti i layer di `confMAPLAYERS`** e li unisce a `passportRoutes$()`
      (`GET /api/passport`) senza chiamate nuove. Un cammino presente in `/api/passport` ma assente
      dalla config non si mostra. Stato del timbro: completato (`completed: true`), in corso
      (presente e non completato), non iniziato (assente).
- [ ] Ordine: in corso per `percent` decrescente, a parità nell'ordine della config; poi completati
      nell'ordine della config; poi non iniziati nell'ordine della config.
- [ ] Timbro: logo nell'anello (`percent`; pieno per i completati, vuoto per i non iniziati), nome e
      una riga — «{{validated}}/{{total}} tappe», «✓ Completato», oppure «{{n}} tappe» da
      `layer.attributes.stage_count` per i non iniziati (riga omessa se il dato manca). Non iniziato
      in grigio. Niente km, niente barra.
- [ ] Senza cammini iniziati, sopra la griglia: «Ogni tappa che ti viene riconosciuta colora il
      timbro del suo cammino.»
- [ ] `PassportService` espone lo **stato** della lettura di `/api/passport`, non solo i dati:
      oggi `passportRoutes$()` emette `null` sia per l'utente non loggato sia per una prima lettura
      fallita, e la pagina non saprebbe distinguerli. Stati: caricamento, errore senza dati,
      dati (eventualmente dell'ultima lettura riuscita).
- [ ] Stato di caricamento finché `/api/passport` e `confMAPLAYERS` non hanno risposto; errore
      senza dati: messaggio con «Riprova». La griglia tutta grigia si mostra solo con una risposta
      riuscita e nessun cammino iniziato.
- [ ] Nuovo `PassportService.refreshPassport()` che rilegge solo `/api/passport` (oggi esiste solo
      `refreshProgress(layerId)`): lo usano «Riprova» e la rilettura al rientro nel tab. Lo stream
      resta stabile (niente riassegnazione in `ionViewWillEnter`, vedi `.claude/rules/`).
- [ ] L'apertura della modale del dettaglio (`backdropDismiss: false`, rilettura del progresso alla
      chiusura) si estrae da `passport-progress-badge.openDetail()` in un punto solo, usato dal badge
      e dal passaporto a timbri.
- [ ] Il dettaglio aperto dal passaporto rilegge subito il progresso del layer: oggi lo rilegge
      solo dal secondo ingresso, e un timbro «Completato» potrebbe aprirsi come «29 di 30 tappe».
- [ ] Un timbro grigio apre il dettaglio così com'è oggi per un cammino senza tappe validate («0 di
      6 tappe», «Richiedi certificazione»).

**Dettaglio nello stato completato** (`progress.completed === true`)
- [ ] Testata: anello pieno, «Cammino completato! 🎉», sottotitolo «Completato il <data>» con il
      `completedAt` più recente fra le tappe, **con l'anno** (il formattatore attuale scrive
      «12 mag»). Se nessuna tappa ha una data, solo «Cammino completato».
- [ ] Il blocco di esito della certificazione («✓ Approvata · Decisa il …», nota del gestore) **non
      si mostra** nello stato completato: il traguardo dice già che è andata a buon fine, e la nota
      resta nella mail.
- [ ] Caselle: **km** = somma di `distance` di tutte le tappe, **nascosta se anche una sola tappa ha
      `distance: 0`** (il backend manda 0 quando il dato manca); **tappe** = «6/6».
- [ ] **Uscite**: casella visibile solo se tutte le tappe hanno `source: 'gps'` e nessuna `manual`;
      vale il numero di giorni distinti di `completedAt`. Oggi non c'è validazione GPS, quindi non
      compare mai.
- [ ] «Condividi il traguardo»: spinge nell'`ion-nav` della modale l'anteprima di condivisione,
      come la tappa (oc:8702), con l'immagine del cammino da `POST /api/layer/{layer}/share-image`.
      L'anteprima riusa `passport-share-preview` con un input che dice se si condivide una tappa o
      un cammino, invece di rendere `stage` opzionale ovunque (titolo, nome del file, messaggi
      d'errore, evento PostHog `contentShared` con un `content_type` distinto). Gli spec esistenti
      della tappa restano invariati, come controllo contro regressioni su oc:8702.
- [ ] La lista delle tappe è chiusa, con «Vedi le {{n}} tappe»; aperta, ogni tappa porta alla sua
      pagina e alla sua condivisione come oggi.
- [ ] Nello stato non completato il dettaglio resta identico a oggi.
- [ ] «Racconta la tua esperienza» e la nota «Credenziale digitale automatica» del wireframe non si
      fanno.

**Trasversali**
- [ ] [UX] Ogni timbro ha un'area di tocco di almeno 44×44 px e un'etichetta accessibile con nome e
      stato; il grigio dei non iniziati lascia il nome leggibile (contrasto almeno 4,5:1).
- [ ] Testi nuovi con chiave = testo italiano, tradotti in it, en, de, es, fr, pr, sq; prima di
      aggiungerne uno, cercare se esiste già.
- [ ] Spec per il passaporto a timbri (ordinamento nei tre gruppi, griglia tutta grigia con la
      riga di spiegazione, caricamento ed errore, unione con la config, `stage_count` assente) e per il
      dettaglio completato (km nascosti con una distanza a 0, data più recente, uscite solo GPS).
- [ ] [UX] La lista delle tappe chiusa/aperta ha `aria-expanded` e un'area di tocco di almeno 44 px.
- [ ] [UX] La testata di celebrazione non anima nulla in modo vistoso; se c'è un'animazione,
      rispetta `prefers-reduced-motion`.

## Rischi

- **I km comprendono le varianti** (limite noto). Le varianti contano nel totale delle tappe e nel
  completamento (knowledge 8166), quindi anche nella somma dei km: un cammino con una variante
  mostra più km del percorso principale, anche nell'immagine condivisa. Si rivede con oc:8165,
  quando il cliente deciderà come trattare le varianti.
- **Il dettaglio è condiviso fra due ingressi.** Lo stato completato cambia anche ciò che vede chi
  apre il dettaglio dalla home del layer. È voluto (decisione col dev), ma va verificato su
  entrambi gli ingressi.
- **Data di completamento con la validazione manuale.** Per le tappe `manual`, `completedAt` è la
  data di approvazione del gestore, non del cammino percorso: «Completato il» resta vero, mentre un
  intervallo «tra il … e il …» non lo sarebbe. Per questo si mostra una sola data.
- **Una modifica qui arriva anche alla webapp.** Il passaporto a timbri è montato solo dalla pagina del tab
  dell'app; lo stato completato del dettaglio invece vale per chiunque monti `passport-detail`.
- **Trappole note di `ion-nav` e `OnPush`** (`.claude/rules/modali-e-ion-nav.md`): niente
  `[root]`/`[rootParams]`, niente riassegnazione dell'observable in `ionViewWillEnter()`.

## Out of scope

- I km nel passaporto a timbri.
- La validazione GPS (oc:8165), da cui dipende il numero di uscite.

## Moduli toccati

- `projects/wm-core/src/passport/passport-stamps/` — nuovo componente del passaporto a timbri
- `projects/wm-core/src/passport/passport-detail/` — stato completato, caselle, lista chiudibile
- `projects/wm-core/src/passport/passport-share-preview/` — esteso al cammino
- `projects/wm-core/src/passport/passport.service.ts` — `requestLayerShareImage(layerId)`, `refreshPassport()`, stato della lettura di `/api/passport`
- `projects/wm-core/src/passport/passport-progress-badge/` — apertura della modale estratta in un punto comune
- `projects/wm-core/src/passport/passport.utils.ts` — calcoli puri (km, data più recente, uscite)
- `projects/wm-core/src/localization/i18n/*.ts` — testi nuovi
