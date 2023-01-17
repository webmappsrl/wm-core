import {ChangeDetectionStrategy, Component, OnDestroy, ViewEncapsulation} from '@angular/core';
import {NavController} from '@ionic/angular';
import {Store} from '@ngrx/store';
import {from, Observable, of} from 'rxjs';
import {DownloadService} from 'src/app/services/download.service';
import {IMapRootState} from 'src/app/store/map/map';
import {setCurrentTrackId} from 'src/app/store/map/map.actions';
import {IGeojsonFeatureDownloaded} from 'src/app/types/model';
import {offline} from 'src/app/store/network/network.selector';
import {INetworkRootState} from 'src/app/store/network/netwotk.reducer';
import {switchMap} from 'rxjs/operators';
@Component({
  selector: 'downloaded-tracks-box',
  templateUrl: './downloaded-tracks-box.component.html',
  styleUrls: ['./downloaded-tracks-box.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DownloadedTracksBoxComponent {
  tracks$: Observable<IGeojsonFeatureDownloaded[] | null>;
  offline$: Observable<boolean> = this._storeNetwork.select(offline);
  constructor(
    private _downloadService: DownloadService,
    private _storeMap: Store<IMapRootState>,
    private _storeNetwork: Store<INetworkRootState>,
    private _navController: NavController,
  ) {
    this.tracks$ = this.offline$.pipe(
      switchMap(off => {
        if (off) {
          return from(this._downloadService.getDownloadedTracks());
        } else {
          return of(null);
        }
      }),
    );
  }

  open(track: IGeojsonFeatureDownloaded) {
    const clickedFeatureId = track.properties.id;
    this._storeMap.dispatch(setCurrentTrackId({currentTrackId: +clickedFeatureId, track}));
    this._navController.navigateForward('/itinerary');
  }

  sizeInMB(size) {
    const million = 1000000;
    if (size > million) {
      return Math.round(size / million);
    } else {
      return Math.round((size * 100) / million) / 100;
    }
  }
}
