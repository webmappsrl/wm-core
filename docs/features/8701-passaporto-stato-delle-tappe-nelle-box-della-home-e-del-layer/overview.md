> Ticket: oc:8701

# Passaporto: stato delle tappe nelle box della home e del layer

## Cosa cambia

Nello shard camminiditalia, per un utente loggato:

- **Card delle tappe (`wm-search-box`)**: sotto la lunghezza compare un chip con lo stato della
  tappa nel passaporto, «✓ percorsa il 12 mag» oppure «○ non ancora percorsa». Il chip compare
  dove la card mostra una tappa ufficiale (`ec_track`): nella lista delle tappe della home di un
  cammino, nei risultati di ricerca, nel dettaglio della mappa e nelle tracce scaricate. Non
  compare sulle tracce dell'utente («I miei percorsi») né nel carosello della mappa
  («features in viewport»).
- **Card dei cammini (`wm-layer-box`)**: attorno al logo compare un anello di progresso. È parziale
  se il cammino è in corso, verde pieno se è completato, e non c'è se il cammino non è iniziato o
  non ha un logo. Vale nella home generale, nei risultati e nei preferiti.

Per un utente non loggato e per tutti gli altri shard non cambia nulla.

Riferimento visivo: [wireframe](https://webmappsrl.github.io/webmapp-app/index.html), viste 0 e 1.

## Perché

È il pezzo rimasto fuori da oc:8676, che ha portato badge e anello nella home del cammino. Senza
lo stato sulle card, l'utente vede quanto ha percorso di un cammino solo dopo esserci entrato, e
non sa quali tappe gli mancano finché non apre il dettaglio del passaporto. Il passaporto va
chiuso in una forma presentabile al cliente (scrum del 02/10).

## Requisiti

### Dati

- [ ] Per l'anello sulle card dei cammini si usa **`GET /api/passport`**, che esiste già nel
      backend camminiditalia (oc:8676) e oggi l'app non chiama: restituisce
      `{ routes: [{ layer_id, validated, total, percentage, completed, … }] }` e contiene **solo i
      cammini con almeno una tappa validata**. Cammino presente in `routes` → anello con
      `percentage`, verde pieno se `completed`; cammino assente → nessun anello. **Il backend non
      si modifica.**
- [ ] Per il chip sulle tappe si costruisce **una mappa unica `trackId → validated_at`** delle
      tappe validate dall'utente: dai cammini elencati in `/api/passport` si chiede
      `GET /api/layer/{id}/progress` (lo stream `progress$` già esistente, con la sua cache per
      layer) e si uniscono le tappe con `status: 'validated'`. Le chiamate sono una più una per ogni
      cammino iniziato, non una per card. Per il backend lo stato è per tappa, non per cammino: una
      tappa validata vale in tutti i cammini che la contengono, quindi la mappa vale anche nei
      risultati di ricerca, dove non c'è un cammino selezionato.
- [ ] Una tappa è identificata confrontando `Number(hit.id)` con il `trackId` del progresso:
      l'indice Elastic usa `ec_tracks.id` (`wm-package/src/Models/EcTrack.php:731` nel backend),
      lo stesso id di `tracks[].id` in `/progress`.
- [ ] Il risultato di `/api/passport` è condiviso da tutte le card (un solo stream con
      `shareReplay`), si rilegge a ogni ritorno dell'app in foreground (`appResume$`, come
      `progress$`) e quando cambia lo stato del login, e si azzera al logout.
- [ ] `refreshProgress(layerId)` rilegge anche `/api/passport`, oltre alla `/progress` del
      cammino: dopo la prima tappa validata di un cammino nuovo, chip e anelli delle card si
      aggiornano subito, senza aspettare il ritorno in foreground.
- [ ] Se una lettura fallisce si mostra l'ultimo valore in memoria; senza nessun valore non si
      mostra nulla, mai «non ancora percorsa» per difetto. La regola vale **per cammino**: se uno
      dei cammini della tappa (`hit.layers`) risulta iniziato in `/api/passport` ma la sua
      `/progress` non ha mai risposto, quella card non mostra il chip.
- [ ] La sorgente dell'anello sulle card è `/api/passport`, mai una `/progress` per card: la
      direttiva usata oggi in `home-layer` (che chiama `visibleProgress(layerId)`) non va riusata
      così com'è in `layer-box`, e il suo comportamento in `home-layer` non cambia.

### Attivazione

- [ ] **Solo in camminiditalia**, con varianti via `fileReplacements` e classe base comune, come
      `home-layer` e `search-bar`: `layer-box.component.camminiditalia.ts` e
      `search-box.component.camminiditalia.ts` estendono `LayerBoxBaseComponent` e
      `SearchBoxBaseComponent` e aggiungono solo lo stato del passaporto; ciascuna ha un template
      proprio, copia del default più il nuovo elemento. I componenti di default estendono la stessa
      base e restano identici nel comportamento per gli altri shard. *(Rivisto dopo
      l'implementazione: il piano prevedeva varianti complete, vedi notes.md.)*
- [ ] Le varianti si dichiarano nella configuration `camminiditalia` di `core/angular.json` in
      `webmapp-app`. La webapp resta fuori: il passaporto vive solo nel branch `Passaporto` di
      `wm-core`, che la webapp (su `develop`) non monta ancora.
- [ ] Nessun flag sul layer: in camminiditalia il passaporto è sempre attivo.
- [ ] **Utente non loggato**: né chip né anello, come già oggi per badge e anello nella home del
      cammino.
- [ ] **Tracce UGC escluse**: la variante di `search-box` non mostra il chip sulle tracce
      dell'utente (la lista `tracks` diventa quella UGC quando sono aperte,
      `store/features/features.selector.ts:46-48`), i cui id si sovrappongono a quelli delle
      `ec_track`.
- [ ] **Carosello della mappa escluso**: in `wm-features-in-viewport` la card ha altezza fissa di
      102px (`features-in-viewport.component.scss:18`) e il chip non ci sta. Lo si nasconde dallo
      stile della variante, senza toccare `features-in-viewport`.
- [ ] **Anello solo sulle card con logo**, come nel wireframe: senza logo la card non mostra il
      progresso, che resta visibile nel badge della home del cammino.

### Presentazione

- [ ] Data del chip con `passportShortDate` (`Intl`, giorno e mese abbreviato, fuso del
      dispositivo), testi con le chiavi i18n che esistono già in tutte e sette le lingue:
      `'percorsa il {{date}}'` e `'non ancora percorsa'`. Nessuna chiave nuova prevista.
- [ ] L'anello delle card usa la stessa regola di `wmPassportLogoRing` (gradi = `percent * 3.6`,
      CSS var `--wm-passport-ring-deg`, `passportRingDegrees`); il verde pieno del completato viene
      da `percent` 100 → 360°. La direttiva di `home-layer` non cambia. Lo stile dell'anello è un
      mixin comune (`passport-logo-ring` in `_passport-theme.scss`), usato da `home-layer` e
      `layer-box`.
- [ ] [UX] Lo stato non è affidato al solo colore: il chip ha sempre icona (✓ / ○) e testo.
- [ ] [UX] Contrasto del testo del chip almeno 4.5:1 sul suo sfondo (verde scuro su verde chiaro,
      grigio scuro su grigio chiaro).
- [ ] [UX] L'anello ha un nome accessibile con la percentuale (es. «64% completato», «Cammino
      completato») e resta leggibile sulla foto di copertina, con un bordo o un'ombra di stacco.
- [ ] [UX] Nessun salto di contenuto sbagliato: finché il dato non è arrivato non si mostra
      nessun chip, per non far vedere «non ancora percorsa» che poi diventa «percorsa».

### Verifica

- [ ] Test unitari in `wm-core` per il nuovo stream del service (lettura di `/api/passport`,
      composizione della mappa, utente non loggato, errore) e per le due varianti (chip e anello
      nei tre stati).
- [ ] Prova manuale su camminiditalia con un utente con almeno un cammino in corso e uno
      completato: home generale, home del cammino, ricerca, «I miei percorsi», carosello della
      mappa, validazione della prima tappa di un cammino nuovo, logout.

## Rischi

- **Copie dei template delle card.** Ogni correzione futura a `layer-box` o `search-box` va
  riportata a mano nelle varianti camminiditalia, e niente lo segnala. È il costo accettato del
  pattern; si mitiga con un commento in testa a ogni copia, e uno nel template di default, che
  indicano l'altro file.
- **Numero di chiamate.** Un utente con molti cammini iniziati fa altrettante chiamate a
  `/progress` all'apertura della home. Con la cache per layer già esistente e i numeri reali
  (pochi cammini iniziati per utente) è accettabile; se crescesse, l'evoluzione naturale è un
  endpoint backend con la sola lista delle tappe validate.
- **Chip nelle tracce scaricate offline.** Senza rete vale l'ultimo valore in memoria, quindi dopo
  un riavvio offline il chip non compare.
- **Cammini senza logo.** Nel DB locale solo 31 layer su 118 hanno un logo: su molte card
  l'anello non comparirà. Scelta accettata per restare fedeli al wireframe; il rimedio è che il
  cliente carichi i loghi.
- **Tappe in corso.** Il chip ha due stati, ma il service conosce anche `in_progress`
  (`passport.service.ts:335`). Oggi il backend restituisce sempre `progress` 0 o 100, quindi non
  succede; quando il GPS di oc:8165 produrrà avanzamenti parziali, una tappa al 60% apparirà come
  «non ancora percorsa» fino a un nuovo intervento.

## Out of scope

- Il flag sul layer per accendere e spegnere il passaporto: sarà valutato in seguito.
- Modifiche al backend camminiditalia.
- La tab «Passaporto» del profilo, la condivisione e la celebrazione del completamento (viste 4-7
  del wireframe).
- La validazione con credenziale cartacea (oc:8166).
- Un invito al login per chi non è loggato.
- La webapp (`wm-webapp`): le due righe di `fileReplacements` si aggiungono quando il passaporto
  arriva in `develop` di `wm-core`. Prima romperebbero la sua build camminiditalia.

## Moduli toccati

**`wm-core`** (`projects/wm-core/src/`):

- `passport/passport.service.ts`: stream di `/api/passport` e mappa delle tappe validate
- `passport/passport.utils.ts`: `passportStageChip`
- `passport/_passport-theme.scss`: colori del chip e mixin `passport-logo-ring`
- `home/home-layer/home-layer.component.camminiditalia.scss`: anello sul mixin comune
- `box/layer-box/layer-box-base.component.ts`, `box/search-box/search-box-base.component.ts`:
  nuove classi base, con la logica spostata dai componenti di default
- `box/layer-box/layer-box.component.ts|html`, `box/search-box/search-box.component.ts|html`:
  estendono la base; nel template un commento che rimanda alla copia camminiditalia
- `box/layer-box/layer-box.component.camminiditalia.ts|html|scss`: nuovi
- `box/search-box/search-box.component.camminiditalia.ts|html|scss`: nuovi
- i rispettivi spec, `layer-box-favorite.spec-support.ts`, `box-template.spec-support.ts`

**`wm-types`**: `src/passport.ts`, `PassportRoute`, `PassportStageIndex`, `PassportStageChip`.

**`webmapp-app`**: `core/angular.json` (due `fileReplacements`), puntatori ai submodule.
