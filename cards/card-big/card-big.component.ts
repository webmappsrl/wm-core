import {ChangeDetectionStrategy, Component, Input, OnInit, ViewEncapsulation} from '@angular/core';
import {NavController} from '@ionic/angular';
import {NavigationOptions} from '@ionic/angular/providers/nav-controller';
import {BehaviorSubject} from 'rxjs';
import {GeohubService} from 'src/app/services/geohub.service';
import {GeoutilsService} from 'src/app/services/geoutils.service';
import {StatusService} from 'src/app/services/status.service';
import {IGeojsonFeature, iLocalString} from 'src/app/types/model';

@Component({
  selector: 'webmapp-card-big',
  templateUrl: './card-big.component.html',
  styleUrls: ['./card-big.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class CardBigComponent implements OnInit {
  private _item: IGeojsonFeature;

  public distance: number = 0;
  public feature_image;
  @Input('showDistance') public showDistance: boolean;
  public title$: BehaviorSubject<iLocalString | null> = new BehaviorSubject<iLocalString | null>(
    null,
  );
  public where: any;

  constructor(
    private navCtrl: NavController,
    private _statusService: StatusService,
    private _geoHubService: GeohubService,
    private geolocationUtils: GeoutilsService,
  ) {}

  @Input('item') public set item(value: IGeojsonFeature) {
    this._item = value;
    if (value != null && value.properties != null && value.properties.name != null) {
      this.title$.next(value.properties.name);
    }
    this.feature_image = value.properties.feature_image;
    this._setTaxonomy(value);
  }

  @Input('term') public set term(value: any) {
    if (value != null && value.title != null) {
      this.title$.next(value.title);
    }
    if (value != null && value.feature_image != null) {
      this.feature_image = value.feature_image;
    }
  }

  public async ngOnInit() {}

  public open() {
    this._statusService.route = this._item;
    // const navigationExtras: NavigationOptions = {
    //   queryParams: {
    //     id: this._id
    //   }
    // };
    // this.navCtrl.navigateForward('route', navigationExtras);
    this.navCtrl.navigateForward('route');
  }

  private async _setTaxonomy(value: IGeojsonFeature) {
    if (value.properties?.taxonomy?.where && value.properties.taxonomy.where.length) {
      let id = value.properties.taxonomy.where[0];
      const taxonomy = await this._geoHubService.getWhereTaxonomy(id);
      this.where = taxonomy.name;
    }
  }
}
