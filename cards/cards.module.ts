import {WmCoreModule} from 'src/app/shared/wm-core/wm-core.module';
import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {IonicModule} from '@ionic/angular';
import {CardBigComponent} from './card-big/card-big.component';
import {CardSliderComponent} from './card-slider/card-slider.component';
import {CardTrackComponent} from './card-track/card-track.component';
import {TranslateModule} from '@ngx-translate/core';
import {PipeModule} from '../pipes/pipe.module';
import {WmSharedModule} from '../shared/shared.module';

const cardComponents = [CardBigComponent, CardSliderComponent, CardTrackComponent];
@NgModule({
  declarations: cardComponents,
  imports: [CommonModule, IonicModule, PipeModule, TranslateModule, WmSharedModule],
  exports: cardComponents,
})
export class CardsModule {}
