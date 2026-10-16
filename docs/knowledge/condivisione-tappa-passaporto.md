# Condivisione della tappa e del cammino del passaporto

## Come funziona oggi

L'immagine e la pagina pubblica le produce il backend camminiditalia (sua pagina
`docs/knowledge/8702-passaporto-condivisione-della-tappa-percorsa.md`); qui c'è il percorso
nell'app. Lo stesso percorso vale per il **cammino completato** (oc:8703): «Condividi il
traguardo» nel dettaglio spinge `wm-passport-share-preview` con `kind: 'route'`, che chiede
l'immagine a `requestLayerShareImage`, cambia testi, nome del file e messaggi d'errore («Questo
cammino non risulta più completato» per 403/404) e manda `content_type: 'passport-route'`.

- Sulle tappe con `shareable: true`, che il backend manda solo per quelle validate, la pagina della
  tappa mostra «Condividi». Il tocco spinge nell'`ion-nav` della modale del passaporto la pagina
  `wm-passport-share-preview`.
- L'anteprima chiede l'immagine con `PassportService.requestStageShareImage`, la mostra e offre i
  pulsanti: nel nativo solo «Condividi»; nel browser «Condividi» se il browser condivide file e
  «Scarica»; se l'immagine non si scarica come Blob (CORS) solo «Apri immagine».
- La parte comune — download in cache, foglio di condivisione, download nel browser — sta in
  `WmShareImageService`, usato anche dalla condivisione UGC dell'app.
- Ogni condivisione compiuta manda `contentShared` con `content_type: 'passport-stage'` e
  `share_method`; niente all'apertura dell'anteprima né su annullamento.
- La pagina della tappa mostra anche la foto (miniatura della prima media della tappa, nascosta se
  manca o non si carica), la lunghezza e i dislivelli, ognuno solo se presente.

## Perché così

- **Anteprima prima di condividere, ovunque** (oc:8702): nel browser la condivisione deve partire
  subito dopo un tocco (vedi `.claude/rules/condivisione.md`), e la generazione dell'immagine può
  durare di più. Con l'anteprima il tocco che condivide arriva a immagine già pronta. Nel nativo
  costa un tocco in più, ripagato dal vedere l'immagine prima di pubblicarla.
- **Niente «Scarica» nel nativo** (oc:8702): salvare in galleria richiederebbe un plugin nativo nuovo
  con i permessi Foto; il foglio di condivisione lo fa già.
- **Lo stesso evento PostHog della condivisione UGC** (oc:8702): `contentShared`, distinto da
  `content_type`, così i report esistenti includono già la tappa.
- **La parte comune in `wm-core`** (oc:8702): la modale del passaporto è aperta da `wm-core`, dove un
  `@Output` non raggiunge l'app.
- **Un'anteprima sola con `kind`** (oc:8703): tappa e cammino hanno gli stessi pulsanti e lo stesso
  comportamento; rendere `stage` opzionale ovunque avrebbe sparso controlli su titolo, nome del
  file e messaggi, mentre gli spec della tappa sono rimasti invariati come controllo.

## Come ci siamo arrivati

- **Due tocchi con «Condividi ora»** (oc:8702, superato): al test sembrava un pulsante che non
  funziona.
- **Un tocco con ripiego su «Condividi ora»** (oc:8702, superato): il ripiego restava necessario
  quando la generazione era lenta.
- **Immagine preparata all'apertura della pagina** (oc:8702, scartato): eliminava il secondo tocco ma
  generava un'immagine a ogni apertura, anche senza condivisione; troppo carico sul backend.
