> Ticket: oc:8761

# Passaporto: data di inizio e di fine percorrenza obbligatorie nella richiesta di certificazione

Questa è la parte app, in wm-core. Il tipo condiviso sta in wm-types e la parte server nel backend
camminiditalia: ciascuno ha la propria overview con lo stesso slug.

## Cosa cambia

Nel form con cui il camminatore chiede la certificazione delle tappe (`wm-passport-form`)
compaiono due campi obbligatori, «Data di inizio» e «Data di fine», che indicano quando ha
percorso il cammino. Si scelgono da un calendario `ion-datetime` aperto in una modale a mezza
altezza, nella lingua dell'app, e vengono inviate al server come `start_date` e `end_date`
(`AAAA-MM-GG`) nel multipart. Se il server rifiuta le date, il camminatore vede un messaggio
tradotto che gli dice di controllarle, non il generico «Invio non riuscito, riprova».

## Perché

Cammini d'Italia vuole le date per le statistiche sui passaggi e considera la richiesta un atto
formale, quindi le vuole obbligatorie e complete di giorno, mese e anno. Call del 12/10/2026,
Davide Nanna: «data inizio e data fine», «essendo formale», «data completa con l'anno». È una
delle modifiche da fare prima del rilascio in produzione del passaporto, previsto in settimana.
Il form non è ancora pubblicato, quindi non serve compatibilità con versioni precedenti.

## Requisiti

- [ ] Due controlli `startDate` e `endDate` (`FormControl<string | null>`, vuoti all'avvio) nel
      `FormGroup` di `passport-form.component.ts`.
- [ ] Ogni campo ha un'etichetta visibile `h3.wm-passport-form-label` con ` *`, come «Foto
      credenziale», e sotto un bottone dell'app che mostra «Seleziona la data» finché il campo è
      vuoto e la data scelta, nel formato della lingua dell'app, dopo la scelta. Non si usa
      `ion-datetime-button`, che con valore vuoto può mostrare la data di oggi.
- [ ] Il bottone apre un `ion-modal` dichiarato nel template (nessun `ModalController` nel
      costruttore, così `passport-form.component.spec.ts` resta valido), con
      `[keepContentsMounted]="true"` e dentro un `ion-datetime` `presentation="date"`. La modale
      è centrata e grande quanto il calendario (`--width: fit-content; --height: fit-content`),
      senza breakpoint: a mezza altezza il calendario (oltre 400 px nello stile Material) su un
      telefono da 640 px resterebbe tagliato e «Conferma» finirebbe sotto il bordo. Toccare fuori
      chiude senza cambiare la data. Il calendario si apre su oggi; il valore si imposta solo
      quando il camminatore conferma.
- [ ] Il calendario usa la lingua dell'app in modo esplicito: `[locale]` = `intlLocale(lang)`,
      `[firstDayOfWeek]="1"`, `cancelText` e `doneText` tradotti («Annulla», «Conferma»). I
      default di Ionic sono `'Cancel'`, `'Done'`, la lingua del telefono e la domenica.
- [ ] Tasto indietro di Android con il calendario aperto: chiude solo il calendario.
      `WmPassportModalComponent.back()` ha priorità 101 e Ionic esegue solo quel gestore, quindi
      quello della modale del calendario (100) non parte mai. Il form espone un metodo (per
      esempio `closeOpenOverlay(): Promise<boolean>`) che chiude il calendario se è aperto;
      `back()` lo chiama per primo, prima degli alert, come già chiede `canLeave()` al form. Non
      si usa `ModalController.getTop()`, che restituirebbe anche la modale del passaporto. La
      trappola si aggiunge in `.claude/rules/modali-e-ion-nav.md`, accanto a quella degli alert.
- [ ] `canLeave()` chiede conferma anche se sono state scelte delle date, non solo se ci sono foto.
- [ ] Limiti: `max` = oggi (data locale del dispositivo) su entrambi; `min` della data di fine =
      data di inizio; nessun minimo sulla data di inizio.
- [ ] Se il camminatore sposta la data di inizio dopo una data di fine già scelta, la data di
      fine si svuota.
- [ ] `canSubmit` richiede entrambe le date valorizzate e coerenti (fine ≥ inizio). Si segue lo
      schema di foto e consenso: «Invia richiesta» resta disabilitato solo durante l'invio, il
      click imposta `triedSubmit` e sotto i campi compare un `ion-note` «Indica le date in cui hai
      percorso il cammino».
- [ ] Il testo del bottone dopo la scelta usa la lingua dell'app (`LangService.currentLang`),
      come il calendario. Il portoghese ha codice `pr`, che `Intl` non riconosce: si riusa
      `intlLocale` di `passport.utils.ts`, oggi privata, esportandola.
- [ ] Le date si trattano come stringhe `AAAA-MM-GG` (`value.slice(0, 10)`) per il confronto e
      per l'invio, mai con `new Date(...)` o `toISOString()`, che su un dispositivo con fuso
      negativo spostano il giorno. Oggi si calcola dai componenti locali della data.
- [ ] `PassportService._toFormData` aggiunge `start_date` ed `end_date`.
- [ ] Un 422 la cui `errors` contiene `start_date` o `end_date` mostra il toast «Controlla le date
      di percorrenza e riprova»; ogni altro errore resta «Invio non riuscito, riprova».
- [ ] Nuove stringhe («Data di inizio», «Data di fine», «Seleziona la data», «Indica le date in cui
      hai percorso il cammino», «Controlla le date di percorrenza e riprova», «Annulla», «Conferma»)
      in tutti e 7 i file di `localization/i18n/`, con chiave =
      testo italiano, dopo aver verificato che non esistano già.
- [ ] Spec: `passport-form.component.spec.ts` copre date mancanti, fine prima di inizio, fine
      svuotata quando l'inizio la supera, invio con le date, `canLeave()` con le sole date;
      `passport.service.spec.ts` verifica `start_date` ed `end_date` nel `FormData` (il suo
      factory `request()` riceve le date, ora obbligatorie nel tipo);
      `passport-modal.component.spec.ts` verifica che `back()` chiuda prima il calendario.
- [ ] [UX] Etichetta visibile sopra ogni campo, mai solo il testo del bottone; indicazione di
      campo obbligatorio uguale agli altri campi del form.
- [ ] [UX] Bottoni che aprono il calendario con area toccabile di almeno 44×44 px.
- [ ] Prova su un telefono Android, fatta dal dev prima della PR: il tasto indietro con il
      calendario aperto chiude solo il calendario; una data di inizio successiva alla fine svuota
      la fine; l'invio senza date mostra la nota.

## Rischi

- **Due modali sovrapposte**: il form vive nell'`ion-nav` della modale del passaporto
  (`passport-modal.component.ts:96`) e il calendario apre una seconda modale. È il primo
  `ion-datetime` in wm-core. Il tasto indietro è gestito da `back()` (requisito sopra); la prova
  su Android, fatta dal dev prima della PR, lo conferma.
- **Ordine dei deploy**: con le date obbligatorie, un'app senza i campi riceve 422 dal server.
  Backend e app vanno rilasciati insieme, e le build di prova già installate vanno aggiornate.
- **Fuso orario e orologio del dispositivo**: il server è in UTC e accetta date fino al giorno
  dopo il suo oggi, che nessun fuso reale supera (il più a est è UTC+14). Il caso vero è un
  orologio del telefono indietro: `max` diventa una data passata e il camminatore non può
  scegliere il giorno in cui ha finito. È raro (ora impostata a mano) e non si mitiga.
- **Ordine dei merge fra submodule**: `startDate`/`endDate` obbligatori in wm-types e il form in
  wm-core devono arrivare insieme nella root: un bump di uno solo dei due rompe la build
  TypeScript di webmapp-app (la CI di wm-core non compila). I due bump dei submodule vanno nello
  stesso commit della root.
- **Cammino fatto in più viaggi**: il form chiede un solo intervallo; chi fa le tappe in viaggi
  separati indicherà un intervallo che li comprende tutti.

## Out of scope

- Mostrare le date al camminatore (dettaglio della richiesta nell'app, mail di esito, risposta
  dell'API sullo stato): l'API verso l'app resta invariata.
- Usare le date come data di completamento delle tappe o nella condivisione del cammino
  completato: resta possibile in futuro, perché le date restano salvate sulla richiesta.
- Modifiche al numero seriale (resta facoltativo) e al consenso (già obbligatorio).

## Moduli toccati

Tutti in wm-core, sotto `projects/wm-core/src/`:

- `passport/passport-form/passport-form.component.ts`, `.html`, `.scss`, `.spec.ts`
- `passport/passport-modal/passport-modal.component.ts` (`back()`), `.spec.ts`
- `passport/passport.service.ts` (`_toFormData`), `passport/passport.service.spec.ts`
- `passport/passport.utils.ts` (`intlLocale` esportata, `todayLocal`, `formatDateForLang` e, dopo la review, `isEndBeforeStart`, `toIsoDate`)
- `passport/passport-leave-guard.ts` (`closeOverlay?()`)
- `localization/i18n/{it,en,de,fr,es,pr,sq}.ts`
- `.claude/rules/modali-e-ion-nav.md` (fuori da `projects/`)

Fuori da wm-core: `src/passport.ts` in wm-types (`PassportCertificationRequest`) e il backend
camminiditalia, ciascuno con la propria overview.
