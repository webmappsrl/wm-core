import {LayerBoxComponent} from './layer-box.component';
import {describeLayerBoxFavoriteBehavior} from './layer-box-favorite.spec-support';

describeLayerBoxFavoriteBehavior(
  'LayerBoxComponent — preferiti (oc:8176)',
  (langSvc, cdr, store, favoriteSvc, posthog) =>
    new LayerBoxComponent(langSvc, cdr, store, favoriteSvc, posthog),
);
