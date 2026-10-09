# Immagini: galleria e dettaglio

Come si arriva dalla miniatura alla foto a schermo intero, e perché lo stesso codice produce
risultati diversi fra webapp e app.

## I componenti in gioco

| Componente | Ruolo |
|---|---|
| `wm-tab-image-gallery` | Sezione "Galleria": titolo + `wm-image-gallery`, con guardia interna su `imageGallery?.length > 0`. Lo montano sia il dettaglio della traccia sia quello del POI, così la sezione si chiama allo stesso modo nelle due schermate |
| `wm-image-gallery` | Lo swiper delle miniature. Il tap su una foto chiama `showPhoto(idx)` |
| `wm-image-detail` | La foto a schermo intero, con swipe fra le immagini e contatore. Store-driven: legge `currentEcImageGallery` e `currentEcImageGalleryIndex`, nessun `@Input` |
| `ModalImageComponent` | Un guscio: `ion-content fullscreen` + pulsante di chiusura, **con dentro `wm-image-detail`** |

## Un solo componente di dettaglio, due contenitori

`wm-image-detail` **è lo stesso su entrambe le piattaforme**. Cambia solo chi lo ospita:

- **web** → avvolto da `ModalImageComponent`, aperto da `showPhoto()`;
- **app nativa** → montato inline dal pannello dei dettagli
  (`webmapp-app/core/src/app/pages/map/map.page.html`), che lo mostra quando `gallery_index` è
  valorizzato e nasconde l'header.

Non esiste un secondo componente di dettaglio, né override nei due prodotti: cercarne uno quando
qualcosa si comporta diversamente è tempo perso. **La differenza è sempre nel contenitore.**

## Il contenitore lo dichiara il prodotto (oc:8406)

`showPhoto()` apre il modale così:

```ts
this._urlHandlerSvc.updateURL({gallery_index: idx});
if (this._presentation === 'modal') {
  // apre ModalImageComponent
}
```

dove `_presentation` arriva da `WM_IMAGE_DETAIL_PRESENTATION`, un `InjectionToken` con default
`inline`. **`wm-webapp` dichiara `modal`**, `webmapp-app` non dichiara niente.

La domanda giusta non è su quale dispositivo gira, ma **se il contenitore monta già la vista
inline**: `webmapp-app` la monta in `map.page.html` su ogni piattaforma, `wm-webapp` non la monta
mai. È una proprietà del prodotto, e dedurla dal dispositivo ha sbagliato due volte.

**Il primo tentativo, `isMobile`** (prima di oc:8406). `isMobile` è
`Platform.is('android') || Platform.is('ios')`, cioè **user agent**: era vero anche per la webapp
aperta da telefono, che però non monta la vista inline. Lì il tap su una foto non apriva nulla e
cambiava solo l'URL — invisibile da desktop e in app, cioè nei due contesti in cui si prova.

**Il secondo, `isAppMobile`** (oc:8406). È `isMobile && !isBrowser`, cioè «dentro l'app nativa»:
correggeva la webapp, ma lasciava fuori la build **web** della mobile — `mobile.webmapp.it` da
telefono, e la PWA — che è `mobileweb`, quindi `isBrowser` vero e `isAppMobile` **falso**. Lì si
apriva il modale **oltre** alla vista inline che il pannello monta comunque: due visori
sovrapposti, e chiudendo il modale si azzerava anche l'inline.

Il default `inline` è scelto perché sbagli nella direzione meno costosa: chi la vista ce l'ha già
non rischia il doppione, e chi non ce l'ha se ne accorge al primo clic invece che su una
piattaforma su tre.

## `object-fit`: `cover` nei box, `contain` nel dettaglio

`wm-img` applica `object-fit: cover` (`img.component.scss`). È corretto ovunque l'immagine debba
riempire un riquadro di proporzioni fisse — `layer-box`, `home-layer`, `slug-box`, `search-box` e
gli altri box — e **non va cambiato lì**: almeno otto componenti dipendono da quel comportamento.

Nel dettaglio serve l'opposto, e la correzione vive in `image-detail.component.scss`:

```scss
wm-img {
  flex: 1 1 auto;
  min-height: 0;        // senza, un figlio flex non scende sotto la dimensione intrinseca
  img {
    object-fit: contain;
    height: 100%;
  }
}
```

**Perché il difetto si vedeva solo sul web.** `modal-image.component.scss` rende il modale
fullscreen sotto i 768px e **quadrato, 700×700, sopra**:

```scss
@media only screen and (min-width: 768px) and (min-height: 768px) {
  ion-modal { --width: 700px; --height: 700px; }
}
```

Con `cover`, una foto verticale dentro un quadrato perde sopra e sotto; dentro un fullscreen
verticale le proporzioni quasi coincidono e il ritaglio è impercettibile. Stesso CSS, due forme di
contenitore, due risultati — non una divergenza di codice fra i prodotti.

## Deep link a una singola immagine: asimmetria nota

`showPhoto()` scrive sempre `gallery_index` nell'URL, ma:

- nell'**app** `wm-image-detail` è montato in base a `currentEcImageGalleryIndex$`, quindi un URL
  con `gallery_index` apre davvero la foto;
- sul **web** il modale è aperto solo dal click dentro `showPhoto()`, e nulla reagisce al
  parametro: aprire l'URL a freddo non mostra il dettaglio.

Non risolto (oc:8406). Chi volesse chiuderlo deve far reagire il web al parametro, non replicare
la vista inline nel popup.
