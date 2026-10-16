> Ticket: oc:8671

# Passaporto camminatore: accettazione della richiesta di certificazione e tappe validate

## Cosa cambia

Nell'istanza camminiditalia (app e webapp) il dettaglio del cammino nel passaporto mostra
l'**esito** della richiesta di certificazione, non più solo lo stato «In revisione». Il backend
camminiditalia di oc:8671 restituisce l'ultima richiesta dell'utente per quel cammino in qualunque
stato. Per ciascuno stato l'app mostra, nello spazio che oggi occupano la CTA e il chip «In
revisione»:

- **nessuna richiesta**: la CTA «Richiedi certificazione», come oggi;
- **in revisione**: il chip ⏳ con la data di invio, come oggi;
- **approvata**: il chip ✓ «Approvata» con la data della decisione, la nota del gestore se c'è, il
  rimando all'email che elenca le tappe riconosciute e il bottone «Invia una nuova richiesta» se
  il cammino non è completo;
- **non accettata**: il chip ✕ «Non accettata» con la data della decisione, la nota del gestore se
  c'è (altrimenti il rimando all'email) e lo stesso bottone «Invia una nuova richiesta».

L'invio della richiesta porta l'header `Accept-Language` con la lingua scelta nell'app, così la
mail di esito arriva in quella lingua. Il dettaglio rilegge lo stato anche quando l'app torna in
primo piano (`resume`), non solo quando si rientra nella pagina.

Il riferimento grafico è la sezione «Esito della richiesta di certificazione (oc:8671)» della
bozza del wireframe, viste E1–E5
(<https://claude.ai/artifact/JLM3UhqH6HhE8iHMddevep>, privata). Il wireframe pubblicato su
GitHub Pages lo aggiorna il dev dopo l'approvazione del CTO.

## Perché

Con oc:8653 e oc:8671 il gestore del cammino decide in Nova, in modo definitivo, quali tappe
riconoscere. Oggi l'app tratta approvata e rifiutata come «nessuna richiesta»
(`passport.service.ts:137-141`): dopo la decisione il camminatore rivede la CTA iniziale, senza
sapere che il gestore ha risposto né perché ha rifiutato. La mail di esito oggi arriverebbe sempre
in italiano, perché l'app non manda la lingua.

## Requisiti

- [ ] `wm-types`: `PassportCertificationStatus` ammette `'none' | 'pending' | 'approved' | 'rejected'`;
      `PassportCertification` porta anche la data della decisione e la nota del gestore (può
      essere assente).
- [ ] `PassportService.getCertification` converte la risposta del GET in tutti e quattro gli stati,
      con `decided_at` e `decision_note`. Uno stato sconosciuto diventa `none`, come oggi.
- [ ] Il POST della richiesta di certificazione, e solo quello, manda `Accept-Language` con
      `LangService.currentLang`. Nessun interceptor globale.
- [ ] Il dettaglio mostra i quattro stati come nelle viste V1, V3, E1–E4 del wireframe, sempre
      fuori dalla lista delle tappe, così lo stato resta visibile senza scroll.
- [ ] «Invia una nuova richiesta» è lo stesso bottone nei due esiti e apre il form esistente.
      Dopo un'approvazione compare solo se il cammino non è completo. Il progresso è ancora il
      mock di oc:8166 (`passport.service.ts:169-171`, deciso da `layerId % 3`): la regola è la
      stessa della CTA iniziale e diventa corretta da sola con il progresso vero.
- [ ] La nota del gestore oltre le 3 righe si tronca con «Leggi tutto» / «Mostra meno» (vista E5).
      «Leggi tutto» compare solo se il testo reale supera le 3 righe. La nota aperta ha
      un'altezza massima di circa un terzo dello schermo e oltre scorre al suo interno, perché il
      dettaglio non scorre (`[scrollY]="false"`) e il bottone di nuovo invio deve restare visibile.
- [ ] Il dettaglio rilegge lo stato al `resume` dell'app solo mentre è aperto, con
      `App.addListener('resume')` di `@capacitor/app`, e rimuove il listener alla chiusura. È
      l'unico meccanismo che scatta sia sul nativo sia nel browser (l'implementazione web ascolta
      `visibilitychange`). `DeviceService.onForeground` no: ascolta `document 'resume'`, che nel
      browser non arriva, ed è un `ReplaySubject(1)` che rilegge appena ci si iscrive.
- [ ] Un errore del GET non chiude lo stream del dettaglio: il `catchError` sta sulla singola
      rilettura. Se fallisce una rilettura resta l'ultimo stato noto; se fallisce la prima la zona
      di stato resta vuota (né CTA né esito). La rilettura successiva riprova da sola.
- [ ] Testi nuovi in tutte le lingue di wm-core (it, en, de, fr, es, pr, sq), con la convenzione
      aziendale: la chiave è il testo italiano, ripetuto come valore anche in `it.ts`.
- [ ] [UX] Ogni stato ha icona e testo, non solo il colore; il blocco dell'esito ha `role="status"`.
- [ ] [UX] Contrasto del testo di chip, nota e data ≥ 4.5:1 sugli sfondi colorati dei due esiti.
- [ ] Test unitari: conversione dei quattro stati (con e senza nota), header nel POST (assente se
      la lingua non è impostata), resa di ciascuno stato nel dettaglio, visibilità del bottone,
      rilettura al `resume`, dettaglio ancora vivo dopo un GET fallito. Il test che oggi
      verifica «approved e rejected diventano none» va riscritto.
- [ ] Prova manuale, guidata da Claude in Chrome e registrata in una GIF, con l'app in locale
      (shard `local`) contro il backend camminiditalia locale sul branch di oc:8671: invio,
      approvazione con e senza nota in Nova, rifiuto con e senza nota, nuovo invio dopo l'esito.
      Si usano cammini con id di resto 0 o 1 (mock del progresso), e una nota lunga per la vista
      E5. Il `resume` va controllato dal dev su un dispositivo vero.

## Rischi

- **Un GET fallito bloccava il dettaglio.** `getCertification` (`passport.service.ts:93-96`) e
  `vm$` (`passport-detail.component.ts:60-72`) non gestiscono errori: un errore chiude lo stream
  e nessuna rilettura successiva funziona più. Con la rilettura al `resume`, spesso con la rete
  non ancora pronta, diventa frequente. Mitigato dal `catchError` sulla singola rilettura.
- **La rilettura al ritorno in primo piano non scatterebbe nella webapp** se agganciata a
  `DeviceService.onForeground`. Mitigato usando `App.addListener('resume')` di `@capacitor/app`.
- **La regola «cammino non completo» usa il progresso finto.** Accettato: la regola resta, e la
  prova manuale usa cammini dove i casi si vedono.
- **La nota aperta può uscire dallo schermo**, perché il dettaglio non scorre. Mitigato con
  l'altezza massima e lo scroll interno alla nota.
- **Il backend non è ancora mergiato**: i nomi `decided_at` e `decision_note` vengono dal branch
  locale di oc:8671. Se cambiano in review si correggono al merge del backend.
- **Dopo una nuova richiesta l'app non mostra più l'approvazione precedente**, perché il GET dà solo
  l'ultima richiesta. Accettato dal dev: le tappe restano registrate nel backend.

## Out of scope

- L'elenco delle tappe riconosciute in app, e l'aggiornamento dell'anello e della lista dopo
  un'approvazione: nessuna API espone le tappe validate. Va chiesto un endpoint al backend,
  insieme alla validazione GPS di oc:8165.
- `Accept-Language` su tutte le chiamate: il dev valuterà in seguito se serve.
- Badge e completamento del cammino da validazione, notifiche push, email al richiedente lato app.
- L'aggiornamento del wireframe su GitHub Pages.

## Moduli toccati

Tutti i percorsi sono relativi a `projects/wm-core/src/` in wm-core, salvo dove indicato.

- `wm-types` → `src/passport.ts`: stato e campi della certificazione.
- `passport/passport.service.ts` e `passport.service.spec.ts`: conversione della risposta, header
  del POST.
- `passport/passport-detail/passport-detail.component.{ts,html,scss}` e `.spec.ts`: stati
  dell'esito, bottone di nuovo invio, rilettura al `resume`.
- `passport/passport-note/` (nuovo) e `wm-core.module.ts`: la nota del gestore troncabile e la sua
  dichiarazione.
- `passport/_passport-theme.scss`: colori dell'esito e mixin dei riquadri di stato.
- `localization/i18n/{it,en,de,fr,es,pr,sq}.ts`: testi nuovi, con la chiave in italiano.
- `passport/passport-form/` e `passport/passport-progress-badge/`: solo le chiavi di traduzione,
  convertite dal formato `passport.*` al testo italiano insieme a quelle nuove.
- `webmapp-app` (repo principale): solo l'aggiornamento dei puntatori ai submodule.
- `wm-webapp`: riceve la modifica con lo stesso aggiornamento di `wm-core` e `wm-types`, da fare
  insieme; non fa parte di questo ciclo.
