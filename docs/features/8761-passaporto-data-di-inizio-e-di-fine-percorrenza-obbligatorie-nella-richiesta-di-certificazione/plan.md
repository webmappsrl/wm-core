> Ticket: oc:8761

# Date di percorrenza nella richiesta di certificazione — piano wm-core

> **Per chi esegue:** usare superpowers:executing-plans o superpowers:subagent-driven-development.
> I commit sono istruzioni per il dev: non si eseguono senza il suo via libera esplicito.

**Obiettivo:** due date obbligatorie nel form del passaporto, scelte da un `ion-datetime` in una
modale centrata, inviate come `start_date`/`end_date`, con il tasto indietro di Android che chiude
prima il calendario.

**Architettura:** due `FormControl<string | null>` nel form esistente; la modale del calendario è
un `ion-modal` inline nel template, una sola, riusata per i due campi (`editing: 'start' | 'end' | null`).
Le date restano stringhe `AAAA-MM-GG` dall'inizio alla fine. `PassportLeaveGuard` riceve un
metodo opzionale con cui la modale del passaporto chiede al form di chiudere il calendario.

**Stack:** Angular 20, Ionic 8.7, Karma + Jasmine.

**Spec:** [overview.md](overview.md). Il tipo è nel piano gemello di wm-types (Task 1, da fare
prima), il server in quello del backend camminiditalia.

## Vincoli globali

- Chiave i18n = testo italiano, ripetuto come valore in `it.ts`; le chiavi `'Annulla'` e
  `'Conferma'` esistono già nei 7 file e si riusano.
- Selettori e classi nuove con prefisso `wm-`; identificatori in inglese; JSDoc su ogni metodo.
- Mai `new Date(stringa)` o `toISOString()` sulle date scelte: solo `slice(0, 10)` e confronti fra
  stringhe `AAAA-MM-GG`.
- Nessuna dipendenza nuova nel costruttore di `WmPassportFormComponent` (lo spec lo costruisce con
  argomenti posizionali).
- Test: dalla cartella di wm-core, una volta `npm install --legacy-peer-deps`, poi
  `npx ng test wm-core --configuration=ci --include='**/passport/**/*.spec.ts'`.
- Branch `feature/oc-8761-passaporto-data-di-inizio-e-di-fine-percorrenza-obbligatorie-nella-richiesta-di-certificazione`
  da `Passaporto` in wm-core, wm-types e webmapp-app; PR verso `Passaporto`.

## Da guardare in review

1. Data di inizio spostata dopo una fine già scelta: la fine si svuota (test nel Task 2).
2. Inizio = fine: valido (test nel Task 2).
3. Tasto indietro con il calendario aperto e con foto già scelte: si chiude il calendario, nessun
   alert (test nel Task 3).
4. Uscita con sole date scelte: chiede conferma (test nel Task 2).
5. 422 con errori solo su `images`: messaggio generico, non quello delle date (test nel Task 4).

---

### Task 1: `intlLocale` esportata e `todayLocal()`

**File:**
- Modifica: `projects/wm-core/src/passport/passport.utils.ts:186-195`
- Test: `projects/wm-core/src/passport/passport.utils.spec.ts` (crealo se non esiste)

**Interfacce:**
- Produce: `export function intlLocale(lang: string | undefined): string` (invariata, ora esportata);
  `export function todayLocal(now?: Date): string` → `AAAA-MM-GG` dai componenti locali di `now`
  (default `new Date()`); `export function formatDateForLang(isoDate: string, lang: string | undefined): string`
  → data nel formato `dateStyle: 'medium'` di `Intl.DateTimeFormat(intlLocale(lang))`, costruita
  con `new Date(y, m - 1, d)` dai pezzi della stringa.

- [ ] **Passo 1: test che falliscono:** `intlLocale('pr') === 'pt'`; `todayLocal(new Date(2026, 9, 4, 0, 30)) === '2026-10-04'`;
      `formatDateForLang('2026-10-04', 'it')` contiene `4` e `2026` e non contiene `3`.
- [ ] **Passo 2:** lancia gli spec del passaporto. Atteso: FAIL (funzioni non esportate).
- [ ] **Passo 3:** esporta `intlLocale`, aggiungi `todayLocal` e `formatDateForLang` con JSDoc.
- [ ] **Passo 4:** rilancia. Atteso: PASS.

### Task 2: date nel form, calendario, uscita protetta

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-2-date-nel-form-calendario-uscita-protetta)

**File:**
- Modifica: `projects/wm-core/src/passport/passport-form/passport-form.component.ts`, `.html`, `.scss`
- Test: `projects/wm-core/src/passport/passport-form/passport-form.component.spec.ts`

**Interfacce:**
- Consuma: Task 1; `PassportCertificationRequest.startDate/endDate` (wm-types).
- Produce sul componente:
  - `form.controls.startDate`, `form.controls.endDate`: `FormControl<string | null>` (null all'avvio);
  - `get datesValid(): boolean` (entrambe presenti e `endDate >= startDate`), usato da `canSubmit`;
  - `editing: 'start' | 'end' | null`; `readonly today: string` (= `todayLocal()` all'avvio);
  - `openCalendar(field: 'start' | 'end'): void`, `onDatePicked(value: string | string[] | null | undefined): void`
    (prende `slice(0, 10)`; se è l'inizio e supera la fine, svuota la fine), `closeCalendar(): void`;
  - `dateLabel(value: string | null): string` → «Seleziona la data» tradotto o `formatDateForLang`.

- [ ] **Passo 1: test che falliscono** (in `fill()` aggiungi `startDate = '2026-09-01'`,
      `endDate = '2026-09-05'`, così i test esistenti restano validi):
      - `senza date non si può inviare e compare la nota` (`canSubmit` false, dopo `submit()`
        `triedSubmit` true e `datesValid` false);
      - `una fine prima dell'inizio non è valida`;
      - `inizio uguale alla fine è valido`;
      - `spostare l'inizio dopo la fine svuota la fine` (via `openCalendar('start')` +
        `onDatePicked('2026-09-10T00:00:00')`);
      - `l'invio porta startDate ed endDate` (argomento di `submitCertification`);
      - `uscita con sole date: chiede conferma` (nessuna foto, date scelte, `canLeave()` crea
        l'alert).
- [ ] **Passo 2:** lancia. Atteso: FAIL.
- [ ] **Passo 3: TS.** Aggiungi i controlli al `FormGroup`, le proprietà e i metodi
      dell'Interfaccia; `canSubmit` aggiunge `this.datesValid`; `submit()` passa
      `startDate`/`endDate`; `canLeave()` chiede conferma anche se c'è almeno una data: con foto
      il messaggio resta «Hai foto non inviate. Vuoi uscire e perderle?», con sole date usa
      «Hai dati non inviati. Vuoi uscire e perderli?».
- [ ] **Passo 4: template**, fra il picker delle foto e il `<form>` (dentro il `formGroup`):
      per ciascun campo un `h3.wm-passport-form-label` («Data di inizio *», «Data di fine *») e
      un `ion-button.wm-passport-form-date` (`fill="outline"`, `expand="block"`) con
      `dateLabel(...)` e `(click)="openCalendar(...)"`; un solo
      `ion-note` «Indica le date in cui hai percorso il cammino» con
      `*ngIf="triedSubmit && !datesValid"`; un solo
      `<ion-modal class="wm-passport-form-calendar" [isOpen]="editing !== null" [keepContentsMounted]="true" (didDismiss)="closeCalendar()">`
      con dentro `<ng-template><ion-datetime presentation="date" [value]="..." [max]="today" [min]="editing === 'end' ? form.controls.startDate.value : undefined" [locale]="locale" [firstDayOfWeek]="1" [showDefaultButtons]="true" [cancelText]="'Annulla' | wmtrans" [doneText]="'Conferma' | wmtrans" (ionChange)="onDatePicked($event.detail.value)"></ion-datetime></ng-template>`.
      `locale` è un getter `intlLocale(this._langSvc.currentLang)`; il `value` iniziale è la data
      del campo o `today`.
- [ ] **Passo 5: stile.** `.wm-passport-form-date { min-height: 44px; }` e
      `ion-modal.wm-passport-form-calendar { --width: fit-content; --height: fit-content; --border-radius: 8px; }`.
- [ ] **Passo 6:** lancia. Atteso: PASS, compresi i test esistenti.

### Task 3: tasto indietro che chiude prima il calendario

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-3-tasto-indietro-che-chiude-prima-il-calendario)

**File:**
- Modifica: `projects/wm-core/src/passport/passport-leave-guard.ts`
- Modifica: `projects/wm-core/src/passport/passport-modal/passport-modal.component.ts:164-175`
- Modifica: `projects/wm-core/src/passport/passport-form/passport-form.component.ts`
- Modifica: `.claude/rules/modali-e-ion-nav.md`
- Test: `projects/wm-core/src/passport/passport-modal/passport-modal.component.spec.ts`,
  `projects/wm-core/src/passport/passport-form/passport-form.component.spec.ts`

**Interfacce:**
- Produce: `PassportLeaveGuard.closeOverlay?(): Promise<boolean>` — `true` se ha chiuso qualcosa;
  `WmPassportFormComponent.closeOverlay()` chiude il calendario se `editing !== null`.

- [ ] **Passo 1: test che falliscono.**
      Modale: `back con il calendario aperto chiude solo il calendario` — guard registrato con
      `closeOverlay` che risolve `true` e `canLeave` spia: dopo `back()` né `canLeave`, né
      `nav.pop`, né `modalCtrl.dismiss` sono chiamati. Più `back senza calendario aperto prosegue
      come prima` (`closeOverlay` → `false`, `nav.pop` chiamato).
      Form: `closeOverlay chiude il calendario aperto` (`editing` torna `null`, risolve `true`) e
      `closeOverlay senza calendario risolve false`.
- [ ] **Passo 2:** lancia. Atteso: FAIL.
- [ ] **Passo 3:** in `back()`, dopo il controllo dell'alert (un alert, se c'è, sta sopra il
      calendario) e prima di `_activeCanLeave()`:
      `if (await this._guard?.closeOverlay?.()) return;`. Aggiorna il JSDoc di `back()`.
      Implementa `closeOverlay()` nel form.
- [ ] **Passo 4:** nella rule, accanto alla voce degli alert, una riga: «**Un gestore del back
      hardware sopra 100 deve chiudere anche le modali aperte dalla pagina.** Quella di un
      `ion-modal` inline usa 100 e non parte: la pagina espone `closeOverlay()` e il gestore lo
      chiama dopo gli alert. Non usare `ModalController.getTop()`, che restituisce anche la
      modale che contiene la pagina (oc:8761).»
- [ ] **Passo 5:** lancia. Atteso: PASS.

### Task 4: invio e messaggio sul 422 delle date

**File:**
- Modifica: `projects/wm-core/src/passport/passport.service.ts:483-494`
- Modifica: `projects/wm-core/src/passport/passport-form/passport-form.component.ts:128-129`
- Test: `projects/wm-core/src/passport/passport.service.spec.ts` (factory `request()` alla riga 36),
  `projects/wm-core/src/passport/passport-form/passport-form.component.spec.ts`

**Interfacce:**
- Produce: `_toFormData` aggiunge `start_date` ed `end_date`; nel form
  `private _isDateRejection(err: unknown): boolean` — `true` se `err` è un `HttpErrorResponse` 422
  la cui `error.errors` ha la chiave `start_date` o `end_date`.

- [ ] **Passo 1: test che falliscono.** Service: il factory `request()` riceve
      `startDate: '2026-09-01', endDate: '2026-09-05'`; `submitCertification invia start_date ed
      end_date` legge il `FormData` della richiesta HTTP. Form: `422 sulle date: messaggio sulle
      date` (toast con «Controlla le date di percorrenza e riprova») e `422 solo sulle foto:
      messaggio generico`.
- [ ] **Passo 2:** lancia. Atteso: FAIL.
- [ ] **Passo 3:** `_toFormData` aggiunge `data.append('start_date', req.startDate)` e
      `data.append('end_date', req.endDate)`; nel form `catch (err)` sceglie il messaggio con
      `_isDateRejection(err)`.
- [ ] **Passo 4:** lancia. Atteso: PASS.

### Task 5: traduzioni

**File:**
- Modifica: `projects/wm-core/src/localization/i18n/{it,en,de,fr,es,pr,sq}.ts`

- [ ] **Passo 1:** verifica che nessuna delle chiavi esista già (`grep -n "'Data di inizio'"` ecc.),
      poi aggiungile in tutti e 7 i file, vicino alle altre del passaporto:

| Chiave (it) | en | de | fr | es | pr | sq |
|---|---|---|---|---|---|---|
| Data di inizio | Start date | Startdatum | Date de début | Fecha de inicio | Data de início | Data e fillimit |
| Data di fine | End date | Enddatum | Date de fin | Fecha de fin | Data de fim | Data e përfundimit |
| Seleziona la data | Select a date | Datum auswählen | Choisir une date | Selecciona la fecha | Selecione a data | Zgjidh datën |
| Indica le date in cui hai percorso il cammino | Enter the dates when you walked the route | Gib an, wann du den Weg gegangen bist | Indique les dates auxquelles tu as parcouru le chemin | Indica las fechas en que recorriste el camino | Indique as datas em que percorreu o caminho | Trego datat kur e ke përshkuar shtegun |
| Controlla le date di percorrenza e riprova | Check the dates of your walk and try again | Überprüfe die Daten deiner Wanderung und versuche es erneut | Vérifie les dates de ton parcours et réessaie | Revisa las fechas del recorrido e inténtalo de nuevo | Verifique as datas do percurso e tente novamente | Kontrollo datat e përshkimit dhe provo përsëri |
| Hai dati non inviati. Vuoi uscire e perderli? | You have unsent data. Leave and lose it? | Du hast nicht gesendete Daten. Verlassen und verwerfen? | Tu as des données non envoyées. Quitter et les perdre ? | Tienes datos sin enviar. ¿Salir y perderlos? | Tem dados não enviados. Sair e perdê-los? | Ke të dhëna të padërguara. Do të dalësh dhe t'i humbasësh? |

- [ ] **Passo 2:** gli spec del passaporto restano verdi.
- [ ] **Passo 3 (istruzione per il dev):**

```bash
git add projects/wm-core/src/passport projects/wm-core/src/localization .claude/rules/modali-e-ion-nav.md docs/features/8761-*/
git commit -m "feat(oc:8761): date di percorrenza obbligatorie nel form del passaporto"
```

### Task 6: root, build e prova su Android

**File:**
- Modifica: puntatori dei submodule `core/src/app/shared/wm-core` e `core/src/app/shared/wm-types`
  nella root di webmapp-app.

- [ ] **Passo 1:** nella root, branch dedicato da `Passaporto`. Le modifiche già presenti in
      `core/src/environments/environment.ts` (root) e in wm-types (`.gitignore`,
      `src/environment.ts`) non c'entrano con il ticket e non entrano nei commit.
- [ ] **Passo 2:** `cd core && npx ng build` con shard camminiditalia in `environment.ts`. Atteso:
      build senza errori TypeScript.
- [ ] **Passo 3 (dev, su Android, prima della PR):** calendario aperto + tasto indietro → si
      chiude solo il calendario, anche con foto scelte; fine scelta poi inizio successivo → la
      fine si svuota; invio senza date → compare la nota. Controlla anche che il calendario sia
      intero, in italiano, con lunedì come primo giorno.
- [ ] **Passo 4 (istruzione per il dev):** un solo commit nella root con i due bump:

```bash
git add core/src/app/shared/wm-core core/src/app/shared/wm-types
git commit -m "feat(oc:8761): aggiorna wm-core e wm-types con le date di percorrenza"
```
