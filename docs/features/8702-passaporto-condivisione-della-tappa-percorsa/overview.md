> Ticket: oc:8702

# Passaporto: condivisione della tappa percorsa — parte `wm-core`

Documento d'insieme, con backend e app: `webmapp-app/docs/features/8702-passaporto-condivisione-della-tappa-percorsa/overview.md`.
Riferimenti visivi: vista 3 e 4 del wireframe (`webmapp-app/docs/features/passaporto-camminatore-wireframe.html`)
e il mockup del cliente `mockup-app.png`.

## Cosa cambia

La pagina della tappa del passaporto (`wm-passport-stage-detail`) resta una pagina separata nella
modale, ma si allinea alla vista 3: foto, distanza, dislivello positivo e negativo, chip di stato e,
sulle tappe percorse, il pulsante «Condividi». La parte comune della condivisione (POST, download
dell'immagine, `Share.share()`) si sposta qui dall'app, insieme alle sue traduzioni, così la pagina
la usa direttamente.

## Perché

Il cliente vuole che il camminatore pubblichi sui social la tappa percorsa. La pagina vive in una
modale con `ion-nav` aperta da `wm-core`, dove un `@Output` non raggiunge l'app; e la logica di
`ShareService` non ha nulla di specifico dell'app, mentre `wm-core` usa già `@capacitor/share` e
`@capacitor/filesystem`.

## Requisiti

- [ ] Servizio di condivisione in `wm-core` con la sola parte comune: POST, download dell'immagine,
      `Share.share()`. Guardia sulle richieste in corso e messaggi d'errore restano di ciascun
      chiamante; i messaggi UGC non cambiano.
- [ ] Il servizio non legge chiavi dell'app: le traduzioni di `services.share` arrivano qui, con la
      chiave in italiano (`'Hai visto questo percorso?'`, `'Condividi con i tuoi amici'`, …), in
      tutte le lingue. Prima di aggiungerle, controllare che non esistano già.
- [ ] Ramo web: il primo tocco genera l'immagine, il pulsante diventa «Condividi ora», il secondo
      tocco chiama `navigator.share` con il file già in memoria. Se il browser non sa condividere
      file, o la condivisione fallisce, download da un `Blob` locale. Niente
      `Filesystem.downloadFile` sul web.
- [ ] `PassportService` mappa i campi nuovi di `progress` (`ref`, `from`, `to`, `ascent`,
      `descent`, `image`, `shareable`) e chiama l'endpoint dell'immagine con `Accept-Language`,
      riusando l'helper esistente.
- [ ] La pagina della tappa mostra la miniatura della `feature_image`, la distanza, il dislivello
      positivo e negativo; ogni voce assente sparisce. Senza immagine o senza rete il blocco della
      foto non compare.
- [ ] «Condividi» compare solo sulle tappe con `shareable: true`.
- [ ] Testi della tappa propri — messaggi d'errore (`'Non è stato possibile creare l\'immagine della
      tappa'`, `'Questa tappa non risulta più percorsa'`) e titolo della condivisione — tradotti in
      it, en, de, es, fr, pr, sq con la chiave in italiano. Si riusano le chiavi esistenti
      (`'Condividi'`, `ascent`, `descent`, `from`, `to`, `'Lunghezza'`).
- [ ] [UX] Etichetta testuale accanto all'icona, area di tocco di almeno 44×44px.
- [ ] [UX] Spinner e pulsante disabilitato durante la generazione dell'immagine.
- [ ] [UX] Messaggio d'errore se la generazione fallisce, con il pulsante di nuovo attivo.

## Rischi

- **Lo spostamento arriva anche a `wm-webapp`**, che monta lo stesso `wm-core`. Mitigazione: i test
  di caratterizzazione di `shareTrackToStories`, scritti nell'app prima dello spostamento, devono
  passare senza modifiche.
- **`navigator.share` scade pochi secondi dopo il tocco**: mitigato dai due tocchi sul web.
- **CORS del disco media `wmfe`**: necessario per scaricare l'immagine come `Blob`, da verificare
  prima del ramo web.
- [UX] **Attesa senza segnali** durante la generazione: mitigata dallo spinner.

## Out of scope

- La versione web della condivisione delle tracce UGC.
- L'adeguamento della grafica del passaporto al design system di Cammini d'Italia.

## Moduli toccati

- `projects/wm-core/src/services/` — servizio di condivisione
- `projects/wm-core/src/passport/passport.service.ts`
- `projects/wm-core/src/passport/passport-stage-detail/passport-stage-detail.component.{ts,html,scss}`
- `projects/wm-core/src/localization/i18n/*.ts`
