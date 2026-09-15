# Immagini: galleria e dettaglio

Come si arriva dalla miniatura alla foto a schermo intero, e perché lo stesso codice produce
risultati diversi fra webapp e app.

## I componenti in gioco

| Componente | Ruolo |
|---|---|
| `wm-tab-image-gallery` | Sezione "Galleria": titolo + `wm-image-gallery`, con guardia interna su `imageGallery?.length > 0` |
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

## `isAppMobile`, non `isMobile` (oc:8406)

`showPhoto()` apre il modale così:

```ts
this._urlHandlerSvc.updateURL({gallery_index: idx});
if (!this._deviceSvc.isAppMobile) {
  // apre ModalImageComponent
}
```

La condizione **deve** essere su `isAppMobile`, non su `isMobile`:

- `isMobile` è `Platform.is('android') || Platform.is('ios')`, cioè **user agent**: è vero anche
  per la webapp aperta da un telefono o un tablet;
- `isAppMobile` è `isMobile && !isBrowser`, cioè **dentro l'app nativa**.

Con `isMobile` la webapp da telefono non apriva né il modale (escluso dalla condizione) né la
vista inline (che monta solo il pannello dell'app): il tap su una foto non apriva nulla e si
limitava a cambiare l'URL. Il difetto era invisibile da desktop e in app, cioè nei due contesti in
cui normalmente si prova.

La distinzione fra le due proprietà va usata per quello che davvero separano — **stare dentro
l'app**, non la dimensione dello schermo.

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
