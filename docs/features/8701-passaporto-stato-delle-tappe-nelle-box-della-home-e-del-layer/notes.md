> Ticket: oc:8701

# Notes — Passaporto: stato delle tappe nelle box della home e del layer

## Divergenze dal piano, task per task

### Task 3 e 4: classi base invece di varianti complete

Il piano (e la scelta «A» in pianificazione) prevedeva varianti complete: `.ts` della variante come
copia dell'originale, senza base, per la regola dell'app sulle classi base. Dopo l'implementazione
il dev ha chiesto di allinearsi al pattern già usato in `wm-core` da `home-layer` e `search-bar`:

- `layer-box-base.component.ts` (`LayerBoxBaseComponent`): preferiti, click, PostHog e input,
  spostati dall'originale; `layer-box.component.ts` e la variante la estendono, la variante
  aggiunge solo `ring$`.
- `search-box-base.component.ts` (`SearchBoxBaseComponent`): `icons$`; la variante aggiunge
  `chip$` e `chipDate`.
- Le basi sono `@Directive()` astratte, non `@Injectable()` come `home-layer`: estendono
  `BaseBoxComponent`, che è una `@Directive`, e `layer-box` ha degli `@Input`. Guardia `ɵfac` in
  `*-base.component.spec.ts`.
- Il criterio è in `docs/knowledge/varianti-per-shard.md`: logica comune identica, la variante
  aggiunge. Il comportamento dei componenti di default non cambia; i loro `.ts` sì.
- I template restano due per componente.

Aggiunte minori: un test di `chipDate` nello spec della variante di `search-box`, e il tipo
`LayerBoxPassportRing` esportato dalla variante di `layer-box` per tipizzare `ring$`.

La webapp era nel piano approvato ed è stata tolta prima dell'esecuzione: il motivo è nelle note
del ticket nel repo `webmapp-app` (`docs/features/<slug>/notes.md`).

## Bug trovati

Nessuno nel codice. Due cose dell'ambiente locale, utili a chi lancia i test di `wm-core` dall'app:

- I test di `wm-core` richiedono Node ≥ 20.19 (Angular CLI), e le dipendenze installate nella
  cartella del submodule (`npm install --legacy-peer-deps`, come la CI).
- Con `wm-core/node_modules` popolata, `ng build` dell'app risolve `@ionic/core` e `swiper` da lì e
  fallisce con `Module not found`. Prima di buildare l'app quella cartella va svuotata.
- La suite completa lanciata in un colpo solo fa disconnettere Chrome headless (ping timeout).
  La causa è la lentezza del primo `TestBed.createComponent` su questa macchina (circa 45 s, che
  bloccano Chrome oltre il ping timeout); in CI la stessa suite gira in pochi secondi. Con una
  configurazione Karma con timeout lunghi (`pingTimeout`, `browserNoActivityTimeout`) passa.
- I 2 test di `LangService.instant` in `localization/` (`compileTranslations` undefined)
  falliscono anche in CI sul branch del passaporto (run del 02/10 su `feature/oc-8676-…`): sono
  preesistenti, non legati a questo lavoro.

## Decisioni

- **Esiti di `wm-review-ticket` (05/10), applicati:**
  - `stageIndex$` riapriva tutte le `/progress` a ogni risposta di `/api/passport`, anche con gli
    stessi cammini (circa 2N+1 chiamate a ogni resume): ora lo `switchMap` riceve l'elenco degli
    id con `distinctUntilChanged`. Test: `una rilettura di /api/passport con gli stessi cammini
    non rilegge le /progress`, prima rosso poi verde.
  - Nel carosello della mappa la variante di `search-box` non si iscrive al passaporto
    (`closest('wm-features-in-viewport')`), invece di nascondere il chip via CSS.
  - L'altezza massima della card con il chip usa una classe impostata dal template, non `:has()`.
  - Anello su un mixin comune (`passport-logo-ring`) per `home-layer` e `layer-box`; colori del
    chip e dell'anello nel tema; `ring$` azzerato se il layer non ha id; commenti di rimando fra
    template di default e copie; JSDoc mancanti; test sul template delle due varianti
    (`box-template.spec-support.ts` con le pipe finte).
  - Non applicato, su scelta del dev: l'esclusione delle UGC resta basata su `ugcOpened`.

- **Anello «completato» senza codice dedicato:** un cammino completato ha `percentage` 100, cioè
  360°, quindi l'anello è già pieno e verde. `WmPassportLogoRingDirective` non è stata toccata e
  `home-layer` resta com'era.
- **Stile delle varianti additivo:** `styleUrls` delle due varianti include lo SCSS di origine più
  il proprio, così lo stile comune non è duplicato. La duplicazione resta solo in `.ts` e `.html`.
- **Spec dei preferiti condiviso:** i test del cuoricino di `layer-box` sono ora in
  `layer-box-favorite.spec-support.ts` e girano sia sull'originale sia sulla variante, come per
  `home-layer`.
- **Chip in una riga propria (correzione dopo la prima prova a schermo):** dentro
  `ion-card-header`, che è flex in colonna, il chip si allargava a tutta la card e ne ereditava i
  margini. Ora sta in `.wm-passport-stage-chip-row`, sotto l'header, largo quanto il testo e con
  il padding laterale dell'header (15px), come nel wireframe. Le card con il chip hanno
  `max-height` 290px invece di 250px, altrimenti un titolo su tre righe lo taglierebbe
  (`overflow: hidden`).
- **Contrasto del chip:** 5,95:1 per «percorsa» (`#1d6b30` su `#eaf7ee`), 6,48:1 per «non ancora
  percorsa» (`#555` su `#f0efeb`).

## Follow-up

- Prova manuale su camminiditalia con un utente reale (task 5, step 3 del piano): non eseguita in
  questa sessione, serve un account con cammini in corso e completati.
- Tappe «in corso» (oc:8165): quando il backend manderà `progress` intermedi, decidere come le
  mostra il chip; oggi risultano «non ancora percorsa».
