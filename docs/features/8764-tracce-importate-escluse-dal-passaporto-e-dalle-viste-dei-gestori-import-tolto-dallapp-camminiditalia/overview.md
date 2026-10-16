> Ticket: oc:8764

# Tracce importate: escluse dal passaporto e dalle viste dei gestori, import tolto dall'app camminiditalia

## Cosa cambia

Due cose, entrambe lato frontend:

1. **Camminiditalia non permette più di importare UGC da file.** Nel box «I miei percorsi»
   (`wm-ugc-box`) sparisce il bottone che apre l'uploader di file GPX, KML e GeoJSON. Vale
   per l'app (build native e deploy web dedicato) e per la webapp di camminiditalia. Il
   bottone è tolto con una variante del componente, applicata con `fileReplacements` nella
   configuration `camminiditalia` dei due prodotti; gli altri shard restano identici.
2. **Ogni UGC importata da file porta nelle properties un oggetto `import`**, per tutte le
   app. L'oggetto descrive il file da cui viene, e la sua sola presenza dice che la UGC è
   importata: una UGC registrata o creata nell'app non lo ha.

```json
"import": {
  "format": "gpx",
  "file_name": "via-degli-dei-tappa-1.gpx",
  "file_size": 48213,
  "file_last_modified": "2026-09-30T08:12:00.000Z",
  "creator": "Garmin Connect",
  "points": 812,
  "file_features": 4,
  "has_time": true,
  "has_elevation": true
}
```

Sui POI importati `has_elevation` non c'è: la loro geometria è sempre 2D, sia importata sia
salvata dall'app.

Le tracce già importate restano all'utente così come sono, senza `import`.

Rispetto alla descrizione iniziale del ticket, **il backend non si tocca in questo lavoro**:
l'esclusione delle tracce importate dal passaporto e dalle viste dei gestori è già stata fatta a
parte.

## Perché

Nella call del 12/10/2026 con Cammini d'Italia il cliente ha chiesto di spegnere l'import
(Davide: «intanto toglierei l'importazione, quella poi la ragioniamo, cioè proprio la escluderei
quella feature»; Giuseppe: «io toglierei la possibilità di importare a mano e semmai studiamo poi
dei connettori direttamente dai dispositivi»): il passaporto deve basarsi solo su tracce
registrate dall'app, e importare un file è un modo di barare. Sulle tracce già importate, Davide:
«Vabbè, lascialela».

Il marcatore serve perché oggi l'origine di una UGC non è scritta da nessuna parte: il backend la
**stima** in `UgcTrack::origin()` (wm-package @ 6ed3ce4a, `src/Models/UgcTrack.php:104-114`)
guardando `_gpxType` (che `@tmcw/togeojson` aggiunge solo ai GPX), `locations` e
`distanceFilter`. Un KML o un GeoJSON sono riconosciuti come importati solo per assenza di
`distanceFilter`, e un GeoJSON esportato da una traccia registrata e reimportato verrebbe preso
per registrato. Un campo esplicito scritto al momento dell'import rende il dato certo, per ogni
app, e conserva informazioni sul file che dopo non sono più recuperabili.

## Requisiti

### Import tolto per camminiditalia

- [ ] Nuova variante `box/ugc-box/ugc-box.component.camminiditalia.ts` in wm-core, con lo stesso
      selettore `wm-ugc-box` e un template proprio `ugc-box.component.camminiditalia.html`, copia
      dell'originale **senza** il bottone di import (`openUgcUploader`).
- [ ] La variante duplica la logica del componente originale invece di estenderlo (vincolo di
      `fileReplacements`, preferenza del repo): toglie solo ciò che serve al bottone
      (`showUgcUploaderButton$`, `openUgcUploader()`), il resto resta identico — immagine, titolo,
      bottone della privacy, `ng-content`, click sul box.
- [ ] `core/angular.json` di webmapp-app: `fileReplacements` della variante nella configuration
      `camminiditalia` sotto `build` (sotto `serve` c'è solo il `buildTarget`, che la eredita).
      Ne beneficiano le build native e `deploy-to-web-camminiditalia`.
- [ ] `angular.json` di wm-webapp: stessa riga nella configuration `camminiditalia`, **nello stesso
      commit** dell'aggiornamento del submodule wm-core a un commit che contiene la variante.
- [ ] Spec della variante (`ugc-box.component.camminiditalia.spec.ts`): il bottone non c'è anche
      con utente loggato e sezione UGC aperta; il bottone della privacy compare ancora quando serve.
- [ ] [UX] Tolto il bottone, il box non mostra spazi vuoti né allineamenti rotti: titolo e
      immagine restano dove sono; il click sul box porta ancora a «I miei percorsi».

### Oggetto `import` nelle properties, per tutte le app

- [ ] **Il flusso dell'import resta com'è**: lettura, conversione, scelta della geometria,
      riduzione a 2D dei POI, pulizia delle properties e salvataggio non cambiano. L'unica
      aggiunta è l'oggetto `import`.
- [ ] Funzione pura in wm-core (es. `utils/ugc-import-info.ts`) che, dati il `File`, il testo letto
      e la feature convertita, restituisce l'oggetto `import`:
  - `format`: `gpx` | `kml` | `geojson`, dall'estensione già usata dall'uploader;
  - `file_name`, `file_size` (byte), `file_last_modified` (ISO 8601, da `File.lastModified`);
  - `creator`: solo per i GPX, dall'attributo `creator` di `<gpx>`, e solo se presente;
  - `points`: numero di coordinate della UGC salvata (l'uploader tiene solo la prima linea, o il
    primo punto, del file);
  - `file_features`: numero di geometrie del file (le feature del `FeatureCollection` convertito
    per GPX e KML; `1` per un GeoJSON, che l'uploader accetta solo come singola feature), così si
    capisce se la UGC è solo una parte del file;
  - `has_time`: per una traccia, `true` se la feature convertita ha
    `properties.coordinateProperties.times` non vuoto (dove `@tmcw/togeojson` mette gli orari di
    GPX e KML) oppure `properties.locations` con orari (GeoJSON esportato da una traccia
    registrata); per un POI, `true` se ha `properties.time`. Un GeoJSON che tiene gli orari in un
    formato suo, ad esempio come quarta coordinata, risulta `false`: limite accettato;
  - `has_elevation`: **solo per le tracce**, `true` se le coordinate hanno la quota.
- [ ] Il componente calcola `import` appena il file è stato convertito con successo
      (`_handleFile`), lo tiene da parte, e `upload()` lo scrive nelle properties della UGC
      insieme ai campi che scrive già (`name`, `form`, `uuid`, `app_id`, `createdAt`, …). Nessuna
      data di import separata: coincide con `createdAt`.
- [ ] Se il file contiene già una sua property `import` (ad esempio un GeoJSON esportato
      dall'app e reimportato), vince quella calcolata ora.
- [ ] Vale per ogni UGC che passa dall'uploader, tracce e POI. Nessun campo di versione
      dentro `import`: i dati servono da consultare, il rischio di forme diverse nel tempo è
      accettato.
- [ ] `import` resta quando l'utente modifica la UGC: la modifica riparte dalle properties
      esistenti (`ugc-track-properties.component.ts:262`), e non va introdotto nulla che lo tolga.
- [ ] Spec della funzione: GPX con `creator`, orari, quote e più tracce (`file_features` > 1);
      KML senza orari; GeoJSON senza quote; POI GPX con `<time>` e senza `has_elevation`; file con
      una property `import` già presente.
- [ ] Nessun tipo da cambiare: `WmProperties` (`wm-types/src/feature.ts:95`) ha un index signature.
      Nessun testo nuovo visibile all'utente, quindi niente i18n.

### Verifica

- [ ] Spec di wm-core verdi lanciandoli **dalla cartella di wm-core** (`npm run test:single`): la
      suite dell'app e quella della webapp non includono i file di wm-core
      (`core/angular.json:170-176`, `wm-webapp/angular.json:136-140`). Dopo i test, la cartella
      `node_modules` di wm-core va cancellata e `ng serve` riavviato, altrimenti l'app non compila
      (oc:8763, `notes.md:28`).
- [ ] A mano: import di un GPX su un'app diversa da camminiditalia, traccia sincronizzata con
      `import` nelle properties sul server.
- [ ] A mano: box UGC senza bottone su camminiditalia nell'app (con `ng serve` riavviato sulla
      configuration giusta) e nella webapp.

## Rischi

- **Drift della variante.** La variante duplica il componente: una modifica futura a
  `ugc-box.component.ts` non arriva a camminiditalia se nessuno aggiorna anche la copia. Mitigato
  tenendo la variante il più possibile uguale all'originale e con lo spec che la esercita.
- **Ordine dei merge con la webapp.** Una riga in `angular.json` della webapp che punta a un file
  non ancora presente nel suo wm-core rompe la build `camminiditalia`, e la CI di wm-core non lo
  vede. Mitigato con submodule e riga nello stesso commit e merge della webapp dopo quello di
  wm-core.
- **`ng serve` non rilegge la configuration.** Dopo aver cambiato shard in `environment.ts` serve
  riavviare il server, altrimenti si vede il box generico e si crede la variante rotta.
- **Il backend non legge `import`.** `origin()` continua a stimare; il dato esplicito serve da
  consultare.
- **Spec che non girano da soli.** Né l'app né la webapp eseguono gli spec di wm-core: vanno
  lanciati a mano dalla cartella di wm-core, come scritto nella verifica.
- **Dati personali in `file_name` e `creator`.** Il nome del file e il creator arrivano sul server
  di ogni cliente; scelta consapevole, il nome resta.
- **Forma di `import` senza versione.** Se le regole dei campi cambieranno, sul server
  conviveranno oggetti scritti con regole diverse; accettato, perché i dati servono solo da
  consultare.

## Out of scope

- Backend: l'esclusione delle tracce importate dal passaporto e dalle viste dei gestori è già
  stata fatta a parte; far leggere `import` a `UgcTrack::origin()` non è previsto.
- Marcare le tracce importate prima di questo lavoro: restano senza `import` e per loro vale la
  stima del backend.
- Connettori con Garmin e altri dispositivi: il cliente ne parlerà più avanti.
- Togliere l'import dagli altri shard.

## Moduli toccati

**wm-core** (submodule, branch da `Passaporto`)
- `box/ugc-box/ugc-box.component.camminiditalia.ts` (nuovo)
- `box/ugc-box/ugc-box.component.camminiditalia.html` (nuovo)
- `box/ugc-box/ugc-box.component.camminiditalia.spec.ts` (nuovo)
- `utils/ugc-import-info.ts` e `utils/ugc-import-info.spec.ts` (nuovi)
- `modal-ugc-uploader/modal-ugc-uploader.component.ts` (`_handleFile` calcola e tiene da parte
  `import`, `upload()` lo scrive)

**webmapp-app** (branch da `Passaporto`)
- `core/angular.json` (`fileReplacements` della configuration `camminiditalia`)
- aggiornamento del puntatore del submodule wm-core

**wm-webapp** (branch da `develop`)
- `angular.json` (`fileReplacements` della configuration `camminiditalia`)
- aggiornamento del puntatore del submodule wm-core, nello stesso commit
