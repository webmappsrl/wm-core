> Ticket: oc:8689

# Tradurre l'etichetta «Modalità di percorrenza» — piano di implementazione

> **Per chi esegue:** piano lineare, un solo dominio: va eseguito con `superpowers:executing-plans`.
> I passi usano le checkbox (`- [ ]`).

**Obiettivo:** l'etichetta del selettore a piedi / in bici nella scheda percorso segue la lingua
dell'app.

**Approccio:** il testo del template passa dalla pipe `wmtrans`, già disponibile nel modulo che
dichiara il componente (`WmPipeModule` in `WmCoreModule`), e la chiave entra nei sette file di
lingua. Nessuna logica nuova.

**Stack:** Angular 20, Ionic 8, ngx-translate dietro `LangService`.

**Spec:** [overview.md](overview.md)

## Vincoli globali

- Repo: solo `wm-core`. Branch `feature/oc-8689-tradurre-letichetta-modalita-di-percorrenza-nella-scheda-percorso-travel-mode`, PR verso `develop`.
- La chiave è esattamente `Modalità di percorrenza`, con la «à» accentata: la ricerca è
  case-sensitive e un carattere diverso lascia l'etichetta in italiano senza errori.
- Nessuno spec: la verifica è manuale (decisione del dev).
- `wm-webapp/src/environments/environment.ts` si cambia solo per la verifica e **non entra mai in
  un commit**, come i puntatori dei submodule.
- Nessun commit senza conferma esplicita del dev: i commit qui sotto sono istruzioni.

## Da guardare in review

1. **Chiave diversa fra template e file di lingua** (accento, spazi): l'etichetta resta in
   italiano. Coperto dal controllo del Task 1, passo 3, e dalla verifica del Task 2.
2. **Una lingua senza la chiave**: quella lingua mostra l'italiano. Coperto dal Task 1, passo 3
   (sette occorrenze attese).
3. **Testo es/fr più lungo dell'italiano**: deve andare a capo o restare intero, mai troncato con
   i puntini. Coperto dal Task 2, passo 4.
4. **Chiave duplicata in un file** (TS1117): la build dei due prodotti si ferma. Coperto dal Task
   1, passo 3 (una sola occorrenza per file) e dalla compilazione di `npm start` nel Task 2.

---

### Task 1: etichetta tradotta e chiave nei sette file di lingua

**File** (tutti relativi a `projects/wm-core/src/` in `wm-core`):
- Modifica: `travel-mode/travel-mode.component.html:4`
- Modifica: `localization/i18n/it.ts:199`, `en.ts:199`, `de.ts:194`, `fr.ts:193`, `es.ts:190`,
  `pr.ts:191`, `sq.ts:198` — subito dopo la riga `'Orario previsto': …`

- [x] **Passo 1: template.** Riga 4: `<ion-label>{{'Modalità di percorrenza'|wmtrans}}</ion-label>`.

- [x] **Passo 2: file di lingua.** In ciascun file, una riga nuova dopo `'Orario previsto'`:

  | File | Riga |
  |---|---|
  | `it.ts` | `'Modalità di percorrenza': 'Modalità di percorrenza',` |
  | `en.ts` | `'Modalità di percorrenza': 'Travel mode',` |
  | `de.ts` | `'Modalità di percorrenza': 'Fortbewegungsart',` |
  | `fr.ts` | `'Modalità di percorrenza': 'Mode de déplacement',` |
  | `es.ts` | `'Modalità di percorrenza': 'Modo de desplazamiento',` |
  | `pr.ts` | `'Modalità di percorrenza': 'Modo de deslocação',` |
  | `sq.ts` | `'Modalità di percorrenza': 'Mënyra e udhëtimit',` |

- [x] **Passo 3: controllo della chiave.** Da `projects/wm-core/src/`:

  ```bash
  grep -c "'Modalità di percorrenza'" localization/i18n/*.ts travel-mode/travel-mode.component.html
  ```

  Atteso: `1` per ciascuno degli otto file. Un `0` è una lingua mancante o una chiave scritta
  diversa; un `2` è un duplicato.

- [ ] **Passo 4: commit** (solo dopo il sì del dev):

  ```bash
  git add projects/wm-core/src/travel-mode/travel-mode.component.html projects/wm-core/src/localization/i18n/*.ts
  git commit -m "fix(oc:8689): tradotta l'etichetta «Modalità di percorrenza» del travel mode"
  ```

### Task 2: verifica manuale su Vivi Lama

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-2-verifica-manuale-su-vivi-lama)

**File:** `wm-webapp/src/environments/environment.ts` (temporaneo, mai committato).

- [x] **Passo 1:** in `environment.ts` imposta `shardName: 'maphub'` e `appId: 2`.
- [x] **Passo 2:** da `wm-webapp`, `npm start`. Atteso: compilazione senza errori.
- [x] **Passo 3:** nel browser apri il dettaglio di un percorso. Atteso: l'etichetta sopra il
      selettore è «Modalità di percorrenza». Cambia lingua in inglese: atteso «Travel mode».
      Screenshot di entrambi per il dev.
- [ ] **Passo 4 [UX]:** con una lingua dal testo lungo (spagnolo o francese, se l'app la offre) e
      con la finestra a larghezza mobile, l'etichetta è intera o va a capo, mai troncata con i
      puntini. Se l'app non offre quelle lingue, annotalo in `notes.md`.
- [x] **Passo 5:** ripristina `environment.ts` (`shardName: 'camminiditalia'`, `appId: 1`) e
      controlla che `git status` di `wm-webapp` non lo mostri modificato.
