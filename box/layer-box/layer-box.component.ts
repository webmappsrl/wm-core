import {NavController} from '@ionic/angular';
import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from '@angular/core';
import {BaseBoxComponent} from '../box';
import {ILAYER, ILAYERBOX} from 'src/app/types/config';

@Component({
  selector: 'wm-layer-box',
  templateUrl: './layer-box.component.html',
  styleUrls: ['./layer-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class LayerBoxComponent extends BaseBoxComponent<ILAYERBOX> {
  @Input() buttons = true;

  constructor(private _navCtrl: NavController) {
    super();
  }

  openMap(): void {
    this._navCtrl.navigateForward('map');
  }
}
