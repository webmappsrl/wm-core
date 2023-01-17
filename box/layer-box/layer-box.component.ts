import {NavController} from '@ionic/angular';
import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {BaseBoxComponent} from '../box';

@Component({
  selector: 'webmapp-layer-box',
  templateUrl: './layer-box.component.html',
  styleUrls: ['./layer-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class LayerBoxComponent extends BaseBoxComponent<any> {
  constructor(private _navCtrl: NavController) {
    super();
  }
  openMap(): void {
    this._navCtrl.navigateForward('map');
  }
}
