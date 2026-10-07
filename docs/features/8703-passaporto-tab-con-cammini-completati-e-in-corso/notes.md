> Ticket: oc:8703

# Notes — Passaporto: tab con cammini completati e in corso (wm-core)

Le note d'insieme stanno in `webmapp-app/docs/features/8703-…/notes.md`.

## Deviazioni dal piano

- **Passaporto a timbri** (`wm-passport-stamps`) al posto dell'elenco a sezioni, su decisione del
  dev: tutti i cammini di `confMAPLAYERS`, in corso → completati → non iniziati in grigio.
- `stagesOpen` del dettaglio è uno stream (`stagesOpen$`, `BehaviorSubject`) con un getter, non un
  campo con `markForCheck`: con `OnPush` il template si aggiorna da sé.
- Spec di oc:8671 «non accettata: bottone di nuovo invio anche a cammino completo» riscritto: a
  cammino completato il blocco di esito non c'è (decisione dell'overview).

## Bug trovati

- Al rientro nel tab con dati già letti e rete lenta la pagina restava vuota: ora
  `passportRoutesState$()` emette subito i dati precedenti a una nuova sottoscrizione.
- Km del dettaglio non localizzati («35.5» in italiano): `passportKm()`.

## Decisioni

- `passportRoutes$()` è derivato da `passportRoutesState$()`: una sola richiesta HTTP, stesse
  emissioni di prima per le card con l'anello.
- `PassportModalService` è il punto unico di apertura del dettaglio (badge e timbri); dai timbri
  rilegge solo il progresso (`reloadProgress`), non `/api/passport`.
- `wmTranslate()` estratta dalla pipe `wmtrans`, usata anche per il titolo dei timbri.
- Colore primario dell'app per pulsanti e badge del passaporto; anelli e «Completato» verdi.

## Follow-up

- Date e uscite contate nel fuso del dispositivo, mentre l'immagine condivisa usa Europe/Rome.
- Gli spec che caricano Ionic superano il ping timeout di Karma (2 s) su macchine lente: in questa
  sessione sono stati lanciati con timeout più lunghi, senza toccare `karma.conf.js`.
