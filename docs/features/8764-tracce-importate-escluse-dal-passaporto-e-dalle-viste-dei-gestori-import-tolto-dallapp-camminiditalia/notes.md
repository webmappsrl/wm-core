> Ticket: oc:8764

# Notes — Import tolto da camminiditalia e oggetto `import` nelle UGC

## Divergenze dal piano, task per task

### Task 2: import scritto dall'uploader

- Il calcolo di `import` passa da un metodo privato `_buildImportInfo` che cattura le eccezioni e
  restituisce `null`: se un file strano facesse fallire il calcolo, l'import si completa comunque,
  senza `import`. Senza la cattura, l'errore finiva nel `catchError` di `_handleFile` e l'utente
  vedeva «Errore durante la lettura del file», cioè un file valido rifiutato.
- `_importInfo` si azzera all'inizio di `_handleFile` (copre tutti i rami di errore insieme) e in
  `removeFile()`, che il piano non nominava: senza, togliere il file e sceglierne un altro
  non valido lascerebbe il valore del primo.

### Task 4: suite di wm-core e pulizia

- `npm install` nella cartella di wm-core riscrive `package-lock.json` e installa
  `@ngx-translate/core` 15 invece della 16.0.4 del lock: il lock di wm-core non è allineato al suo
  `package.json` (devDependency `^15.0.0`, dependency `^16.0.0`), e `npm ci` rifiuta di partire.
  Il lock è stato ripristinato dopo ogni installazione.
- Suite completa: 785 test verdi, 3 rossi, nessuno legato a questo lavoro. I due di
  `lang.service.spec.ts` (`compileTranslations` di `undefined`) falliscono anche lanciati da soli
  e con `@ngx-translate/core` 16.0.4: lo spec non importa nessun file toccato qui. Quello di
  `passport-share-preview.component.spec.ts` (`onAriaChanged` di `undefined`) da solo passa:
  dipende dall'ordine casuale dei test.
- I test vanno lanciati con Node ≥ 20.19 (Angular CLI); col Node 18 di default non partono.

### Task 6: `fileReplacements` nella webapp

- La riga in `angular.json` di wm-webapp è scritta, ma il puntatore del submodule wm-core della
  webapp non si può ancora aggiornare: la variante non è committata. Va aggiornato **nello stesso
  commit** della riga, a un commit di wm-core che contiene la variante; fino ad allora la build
  `camminiditalia` della webapp non compila. La verifica della webapp si fa a quel punto.

## Bug trovati

Nessuno nel codice toccato.

## Decisioni

- **Classe base per il box UGC e template unico, decisi in review** (modifica a posteriori
  rispetto a piano e overview, che prevedevano una copia completa di classe e template):
  `UgcBoxBaseComponent`, `@Directive()` astratta, contiene tutta la logica del box (immagine,
  login, sezione UGC aperta, bottone di import, privacy, `openUgcUploader()`). Il default la estende
  senza aggiunte; la variante la estende e sovrascrive solo
  `showUgcUploaderButton$ = of(false)`. Entrambe usano `ugc-box.component.html`, che resta identico
  a prima del ticket: nessun template copiato da allineare a mano, come chiede la regola
  `varianti-e-classi-base.md` quando la struttura DOM non cambia. Motivo: allinearsi alle altre
  varianti camminiditalia di wm-core, che hanno tutte una base (oc:8701 aveva scartato la copia per
  non correggere due volte). Guardia su `ɵfac` in `ugc-box-base.component.spec.ts`, spec del default
  in `ugc-box.component.spec.ts`.
- **Correzioni della review formale** (cleanup chiesti dal dev):
  - `_importInfo` si azzera nei rami di esito di `_handleFile` e non più all'inizio: scegliere un
    secondo file e salvare mentre è ancora in lettura non perde più l'`import` del primo;
  - `upload()` scrive sempre `import`, `undefined` se il calcolo è fallito: un `import` già presente
    nel file non arriva mai sul server; il fallimento del calcolo finisce in `console.warn`;
  - `file_last_modified` manca invece di far fallire tutto l'oggetto quando `File.lastModified` non
    è un numero valido;
  - `has_time` dei POI legge anche `properties.timestamp` (`<TimeStamp>` dei Placemark KML);
  - funzioni di modulo senza il prefisso `_`, JSDoc completo, `c?.[2]` su coordinate nulle.
  Non fatto: rileggere il file una volta sola invece di due (`creator`, `file_features`), per non
  toccare il flusso dell'import; uno spec dell'ordine dello spread in `upload()`, perché
  l'uploader non ha spec e costruirlo richiede di simulare store, modal e device.
- **Prova della variante nella build**: con il template condiviso `cloud-upload-outline` c'è in
  tutte le build, quindi non prova più nulla. Nella build di sviluppo la prova è la riga
  `showUgcUploaderButton$ = (0,rxjs__WEBPACK_IMPORTED_MODULE_N__.of)(false)`, presente solo con la
  configuration `camminiditalia` (verificato su due build separate). Suite di wm-core dopo le
  correzioni: 791 verdi, 2 rossi preesistenti (`LangService`).
- **Webapp**: l'ordine dei merge (wm-core `Passaporto` ha 39 commit non in `develop`, quindi la riga
  della webapp entra solo dopo il merge di `Passaporto` in `develop` di wm-core) non è un problema
  per il dev.
- Tag di Orchestrator saltati su richiesta del dev, sia quelli di ambiente sia quelli di
  contenuto.
- Backend fuori da questo ticket: l'esclusione delle tracce importate dal passaporto e dalle viste
  dei gestori è già stata fatta a parte. Il titolo del ticket va cambiato a fine lavoro.
- `import` senza `origin` e senza `imported_at` (coincide con `createdAt`); nessun campo `version`
  (i dati servono da consultare, il rischio di forme diverse nel tempo è accettato); `file_name`
  tenuto nonostante possa contenere dati personali.
- `has_elevation` solo sulle tracce: la geometria dei POI è sempre 2D, sia importata
  (`_force2DGeometry`) sia salvata dall'app (`modal-save.component.ts:216`).
- `points` conta la UGC salvata; `file_features` (campo aggiunto in challenge) le geometrie del
  file.
- Le tracce già importate restano senza `import`.
- Verifica della build camminiditalia dell'app fatta con una build separata in una cartella
  temporanea, senza riavviare il `ng serve` del dev: nessun bundle contiene `cloud-upload-outline`,
  il template della variante e il calcolo di `import` ci sono. Il server acceso, partito prima della
  modifica, aveva ancora l'icona in `main.js`.

## Follow-up

- Verifiche a mano del Task 5: «I miei percorsi» su camminiditalia (dopo il riavvio di `ng serve`) e
  un import GPX su uno shard generico con `properties.import` sul server.
- Aggiornare il submodule wm-core in wm-webapp e verificare la build `camminiditalia` della webapp.
- Il lock di wm-core fuori sincrono col `package.json` e i due test di `LangService` rossi sono
  debito preesistente.
