import {ModalController} from '@ionic/angular';

import {ImageGalleryComponent} from './image-gallery.component';
import {ModalImageComponent} from '@wm-core/modal-image/modal-image.component';

/**
 * Il contenitore del dettaglio immagine lo dichiara il **prodotto**, non il dispositivo: la webapp
 * `modal`, l'app `inline`. Fino a oc:8406 la scelta era dedotta da `isAppMobile`, e la build web
 * della mobile — `mobileweb` — finiva nel ramo della webapp aprendo il modale **sopra** la vista
 * inline che il pannello monta comunque.
 *
 * Il difetto stava in un `if` senza spec: due casi bastano a proteggerlo.
 */
describe('ImageGalleryComponent.showPhoto: il contenitore (oc:8406)', () => {
  const crea = (presentation: 'modal' | 'inline') => {
    const modalCtrl = jasmine.createSpyObj('ModalController', ['create']);
    modalCtrl.create.and.returnValue(Promise.resolve({present: () => Promise.resolve()}));
    const urlHandlerSvc = jasmine.createSpyObj('UrlHandlerService', ['updateURL']);
    const component = new ImageGalleryComponent(
      modalCtrl as ModalController,
      {select: () => ({subscribe: () => ({unsubscribe: () => {}})})} as any,
      urlHandlerSvc as any,
      presentation,
    );
    return {component, modalCtrl, urlHandlerSvc};
  };

  it("con 'modal' apre ModalImageComponent", async () => {
    const {component, modalCtrl, urlHandlerSvc} = crea('modal');

    await component.showPhoto(2);

    expect(urlHandlerSvc.updateURL).toHaveBeenCalledWith({gallery_index: 2});
    expect(modalCtrl.create).toHaveBeenCalledWith({component: ModalImageComponent});
  });

  it("con 'inline' non apre niente: il contenitore mostra già la vista", async () => {
    const {component, modalCtrl, urlHandlerSvc} = crea('inline');

    await component.showPhoto(2);

    expect(urlHandlerSvc.updateURL)
      .withContext("l'indice serve comunque: è quello che il contenitore osserva")
      .toHaveBeenCalledWith({gallery_index: 2});
    expect(modalCtrl.create)
      .withContext('due visori sovrapposti, ed è il difetto che oc:8406 ha corretto')
      .not.toHaveBeenCalled();
  });
});
