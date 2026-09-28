import {InjectionToken} from '@angular/core';

/**
 * Dove va mostrato il dettaglio di un'immagine: dentro un modale a schermo intero, oppure inline,
 * montato dal contenitore che reagisce a `gallery_index` nell'URL.
 */
export type WmImageDetailPresentation = 'modal' | 'inline';

/**
 * **Lo decide il prodotto, non il dispositivo.**
 *
 * Fino a oc:8406 `wm-image-gallery` apriva il modale quando `isAppMobile` era falso, cioè «non
 * siamo dentro l'app nativa». Ma `isAppMobile` è `isMobile && !isBrowser`, e la build **web** della
 * mobile — `mobile.webmapp.it` aperta da telefono, e la PWA — è `mobileweb`: lì `isBrowser` è vero,
 * quindi si apriva il modale **oltre** alla vista inline che il pannello monta comunque. Due visori
 * sovrapposti, e chiudendo il modale si azzerava anche l'inline.
 *
 * Il criterio giusto non è su quale dispositivo gira, ma **se il contenitore monta già la vista
 * inline**: `webmapp-app` la monta in `map.page.html` su ogni piattaforma, `wm-webapp` non la monta
 * mai. È una proprietà del prodotto, e i prodotti la dichiarano invece di farla dedurre.
 *
 * Il default è `inline`, cioè «non aprire niente da solo»: un contenitore che mostra il dettaglio
 * per conto proprio non rischia di ritrovarsi due visori se dimentica di dichiararlo. Chi non monta
 * niente inline — la webapp — deve invece dichiarare `modal`, e senza quello il tap su una foto non
 * aprirebbe nulla: un difetto che si vede al primo clic, mentre quello opposto si vede solo su una
 * piattaforma su tre.
 */
export const WM_IMAGE_DETAIL_PRESENTATION = new InjectionToken<WmImageDetailPresentation>(
  'WM_IMAGE_DETAIL_PRESENTATION',
  {providedIn: 'root', factory: () => 'inline'},
);
