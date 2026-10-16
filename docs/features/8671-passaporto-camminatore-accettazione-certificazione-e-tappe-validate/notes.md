> Ticket: oc:8671

# Notes — Esito della richiesta di certificazione nel passaporto

## Divergenze dal piano, task per task

### Ordine delle fasi: piano prima della stima

`wm-estimate` non stima senza un `plan.md`, quindi il piano è stato scritto prima della stima. Il
dev ha poi saltato la stima: su Orchestrator resta la stima del backend (6,2h).

### Task 2: listener del resume

Il piano chiedeva di spiare `App.addListener`, ma `App` di Capacitor è un Proxy e lo spy non ha
effetto. Il listener è registrato in `_addResumeListener`, privato, che i test spiano con
`spyOn<any>`.

### Task 5: colore del bottone di nuovo invio

Il bottone usa `$passport-green-dark` (`#1d6b30`) invece del verde del wireframe (`#2f9e44`):
bianco su `#2f9e44` ha contrasto 3,45:1, sotto il 4,5:1 richiesto dall'overview; su `#1d6b30` è
6,57:1. Al tema si aggiungono anche `$passport-green-chip` e `$passport-note-label`. Da segnalare
quando si aggiorna il wireframe pubblicato.

### Task 5: chiavi di traduzione col testo italiano

Il piano usava chiavi `passport.*`, come oc:8166. Dopo l'implementazione il dev ha chiesto di
seguire la convenzione aziendale: la chiave è il testo italiano, ripetuto come valore anche in
`it.ts` (es. `'Richiedi certificazione': 'Demander la certification'`). Sono state convertite
tutte e 31 le chiavi del passaporto, le 22 di oc:8166 comprese, in 7 lingue e in template,
componenti e spec (badge, dettaglio, form, nota). `passport.note.less` è stata tolta: esisteva già
`'Mostra meno'` con le stesse traduzioni in tutte le lingue.

### Task 6: prova manuale

Nel browser l'invio della richiesta non si può guidare dal form, perché il plugin Camera di
Capacitor apre il selettore di file del sistema. La richiesta di prova (Via degli Dei, layer 18,
lingua dell'app `en`) è stata inviata con una `fetch` dalla pagina, con lo stesso multipart del
servizio. Il dettaglio ha mostrato «Under review» con la data al rientro nella pagina. Le decisioni
in Nova e la verifica degli esiti in app le ha fatte il dev, con esito positivo. Nessuna GIF.
La lingua è arrivata al backend: la richiesta di prova ha `certification_requests.locale = "en"`
e la mail di esito è partita in inglese (verifica in sola lettura di camminiditalia-fb). Il
percorso del servizio che costruisce l'header è coperto da `passport.service.spec.ts`.

### Review con wm-review-ticket: cleanup applicati

Dopo la review sono state applicate le pulizie chieste dal dev, tranne la rimisura della nota
quando cambia solo il testo:
- le condizioni del blocco dell'esito sono passate dal template al vm (`outcome`,
  `showEmailHint`), con i test;
- i riquadri «In revisione» ed esito usano due mixin del tema (`passport-status-box`,
  `passport-status-chip`), e i colori nuovi stanno tutti in `_passport-theme.scss`;
- la chiave generica `'il {{date}}'` è diventata `'Decisa il {{date}}'`, che cambia anche il testo
  mostrato («Decisa il 30 set» invece di «il 30 set»);
- commenti di sezione degli i18n con oc:8671, commento su `_resumeSub`, tolto il `?.` superfluo su
  `_langSvc`.

Il test del template con `TestBed` non è stato aggiunto: blocca ChromeHeadless già al caricamento,
prima del primo test, come la suite completa di wm-core. Le condizioni del template ora stanno
nel vm e sono coperte dai test di classe.

## Bug trovati

- **Un GET fallito chiudeva lo stream del dettaglio** (preesistente, da oc:8166): da quel momento
  nessuna rilettura funzionava più fino alla riapertura della modale. Corretto con il `catchError`
  sulla singola rilettura.

## Decisioni

- Convenzione delle traduzioni (chiave = testo italiano) applicata a tutto il passaporto, su
  richiesta del dev dopo l'approvazione del piano.
- Tag di Orchestrator non associati: il dev ha chiesto di lasciarli per ora.
- Wireframe: la bozza estesa con le viste E1–E5 è privata
  (<https://claude.ai/artifact/JLM3UhqH6HhE8iHMddevep>). GitHub Pages e
  `docs/features/passaporto-camminatore-wireframe.html` nell'app si aggiornano dopo l'ok del CTO.
- Nessuna riga nel form dopo un'approvazione per dire che le tappe già riconosciute restano valide:
  il dev la ritiene superflua.
- `Accept-Language` porta il codice interno della lingua, quindi `pr` per il portoghese. Il backend
  supporta solo it, en, fr, es e de: `pr` e `pt` ricadono comunque su `it`.
- Verifiche: `ng build` dell'app eseguita con esito positivo, anche dopo la conversione delle chiavi e
  dopo i cleanup. Test eseguiti solo su `passport/**/*.spec.ts` (83/83): la suite completa di wm-core va in timeout
  su ChromeHeadless già prima di queste modifiche. Serve Node ≥ 20.19: con il Node 18 di default
  Angular CLI non parte.

## Follow-up

- Endpoint del backend per le tappe validate, insieme a oc:8165: senza, dopo un'approvazione anello
  e lista non cambiano.
- Prova end-to-end su un ambiente condiviso quando backend (oc:8653, oc:8671) e frontend sono
  mergiati; il `resume` va guardato su un dispositivo vero (il callback nativo gira fuori da NgZone).
- Mappare `pr` → `pt` nell'header se il backend aggiunge il portoghese.
- Il disclaimer del form è ancora un testo segnaposto e, con la convenzione «chiave = testo
  italiano», fa anche da chiave: quando arriva il testo legale va cambiato nel template e in tutte e
  7 le lingue, non solo nei valori.
- Capire perché un test di componente con `TestBed` blocca ChromeHeadless in wm-core: è anche la
  causa probabile del timeout della suite completa.
- Minori lasciati dalla review finale:
  - la nota non si rimisura se cambia solo il testo a parità di altezza, e `expanded` non si
    azzera all'arrivo di una nota nuova;
  - `role="status"` avvolge tutto il blocco dell'esito invece della sola riga chip + data;
  - le emoji ✓ ✕ 📷 non hanno `aria-hidden`;
  - manca `aria-controls` fra «Leggi tutto» e il testo;
  - nessun test di `_measure()`;
  - `appResume$()` è un metodo col suffisso `$`.
