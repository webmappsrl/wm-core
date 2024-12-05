import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {ActivatedRoute, Router} from '@angular/router';
import {ModalController, NavController} from '@ionic/angular';
import {Store} from '@ngrx/store';
import {BehaviorSubject, combineLatest, Observable} from 'rxjs';
import {debounceTime, filter, map, take, withLatestFrom} from 'rxjs/operators';
import {
  setLayer,
  togglePoiFilter,
  toggleTrackFilterByIdentifier,
} from '@wm-core/store/features/ec/ec.actions';
import {countEcAll, showResult} from '@wm-core/store/features/ec/ec.selector';
import {confAPP, confHOME, confPROJECT, confOPTIONS} from '@wm-core/store/conf/conf.selector';
import {
  IAPP,
  IHOME,
  ILAYER,
  ILAYERBOX,
  IOPTIONS,
  IPOITYPEFILTERBOX,
  ISLUGBOX,
} from '@wm-core/types/config';
import {WmInnerHtmlComponent} from '@wm-core/inner-html/inner-html.component';
import {countUgcAll} from '@wm-core/store/features/ugc/ugc.selector';
import {ugcOpened} from '@wm-core/store/user-activity/user-activity.selector';
import {
  closeUgc,
  inputTyped,
  openUgc,
  resetTrackFilters,
  setCurrentPoi,
} from '@wm-core/store/user-activity/user-activity.action';
import {WmFeature} from '@wm-types/feature';
import {WmSearchBarComponent} from '@wm-core/search-bar/search-bar.component';
import {Point} from 'geojson';
@Component({
  selector: 'wm-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmHomeComponent implements AfterContentInit {
  @ViewChild('searchCmp') searchCmp: WmSearchBarComponent;

  confAPP$: Observable<IAPP> = this._store.select(confAPP);
  confHOME$: Observable<IHOME[]> = this._store.select(confHOME);
  confOPTIONS$: Observable<IOPTIONS> = this._store.select(confOPTIONS);
  countAll$: Observable<number>;
  countEcAll$: Observable<number> = this._store.select(countEcAll);
  countUgcAll$: Observable<number> = this._store.select(countUgcAll);
  popup$: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  showResult$ = this._store.select(showResult);
  ugcOpened$ = this._store.select(ugcOpened);

  constructor(
    private _store: Store,
    private _router: Router,
    private _route: ActivatedRoute,
    private _modalCtrl: ModalController,
    private _navCtrl: NavController,
    public sanitizer: DomSanitizer,
  ) {
    this.countAll$ = combineLatest([this.countEcAll$, this.countUgcAll$, this.ugcOpened$]).pipe(
      map(([ec, ugc, ugcOpened]) => (ugcOpened ? ugc : ec)),
    );
  }

  ngAfterContentInit(): void {
    this.confHOME$
      .pipe(
        filter(h => h != null),
        withLatestFrom(this._route.queryParams),
        debounceTime(1800),
      )
      .subscribe(([home, params]) => {
        if (params.layer != null && home[params.layer] != null) {
          const layerBox: ILAYERBOX = home[+params.layer] as ILAYERBOX;
          this.setLayer(layerBox.layer);
        } else if (params.filter != null && home[params.filter] != null) {
          const filterBox: IPOITYPEFILTERBOX = home[+params.filter] as IPOITYPEFILTERBOX;
          this.togglePoiFilter(filterBox.identifier);
        }
        if (params.slug != null && home[params.slug] != null) {
          const slugBox: ISLUGBOX = home[+params.slug] as ISLUGBOX;
          this.openSlug(slugBox.slug);
        }
      });
  }

  goToHome(): void {
    this.setLayer(null);
    this.searchCmp.reset();
    this._router.navigate([], {
      relativeTo: this._route,
      queryParams: {layer: null, filter: null},
      queryParamsHandling: 'merge',
    });
  }

  openExternalUrl(url: string): void {
    window.open(url);
  }

  openSlug(slug: string, idx?: number): void {
    if (slug === 'project') {
      this._store
        .select(confPROJECT)
        .pipe(take(1))
        .subscribe(conf => {
          this._modalCtrl
            .create({
              component: WmInnerHtmlComponent,
              componentProps: {
                html: conf.html ? conf.html : conf.HTML,
              },
              cssClass: 'wm-modal',
              backdropDismiss: true,
              keyboardClose: true,
            })
            .then(modal => {
              modal.present();
              if (idx) {
                this._router.navigate([], {
                  relativeTo: this._route,
                  queryParams: {slug: idx},
                  queryParamsHandling: 'merge',
                });
              }
            });
        });
    } else {
      this._navCtrl.navigateForward(slug);
    }
  }

  removeLayer(_: any): void {
    this.setLayer(null);
    this._router.navigate([], {
      relativeTo: this._route,
      queryParams: {layer: null},
      queryParamsHandling: 'merge',
    });
  }

  setFilter(filter: {identifier: string; taxonomy: string}): void {
    if (filter == null) return;
    if (filter.taxonomy === 'poi_types') {
      this._store.dispatch(togglePoiFilter({filterIdentifier: filter.identifier}));
    } else {
      this._store.dispatch(
        toggleTrackFilterByIdentifier({identifier: filter.identifier, taxonomy: filter.taxonomy}),
      );
    }
  }

  setLayer(layer: ILAYER | null | any, idx?: number): void {
    if (layer != null && typeof layer === 'number') {
      layer = {id: layer};
    }
    if (layer != null && layer.id != null) {
      this._store.dispatch(setLayer({layer}));
    } else {
      this._store.dispatch(setLayer(null));
      this._store.dispatch(resetTrackFilters());
    }
    if (idx) {
      this._router.navigate([], {
        relativeTo: this._route,
        queryParams: {layer: idx},
        queryParamsHandling: 'merge',
      });
    }
    this._store.dispatch(closeUgc());
  }

  setPoi(currentPoi: WmFeature<Point>): void {
    this._store.dispatch(setCurrentPoi({currentPoi: null}));
    setTimeout(() => {
      this._store.dispatch(setCurrentPoi({currentPoi: currentPoi}));
    }, 200);
  }

  setSearch(value: string): void {
    this._store.dispatch(inputTyped({inputTyped: value}));
  }

  setTrack(id: string | number): void {
    this.ugcOpened$.pipe(take(1)).subscribe(ugcOpened => {
      const queryParams = ugcOpened ? {ugc_track: id ? +id : null} : {track: id ? +id : null};
      this._router.navigate([], {
        relativeTo: this._route,
        queryParams,
        queryParamsHandling: 'merge',
      });
    });
  }

  setUgc(): void {
    this._store.dispatch(openUgc());
  }

  togglePoiFilter(filterIdentifier: string, idx?: number): void {
    this.setFilter({identifier: filterIdentifier, taxonomy: 'poi_types'});
    if (idx) {
      this._router.navigate([], {
        relativeTo: this._route,
        queryParams: {filter: idx},
        queryParamsHandling: 'merge',
      });
    }
  }
}
