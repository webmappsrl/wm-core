import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {ModalController, NavController} from '@ionic/angular';
import {Store} from '@ngrx/store';
import {BehaviorSubject, combineLatest, Observable} from 'rxjs';
import {debounceTime, filter, map, take, withLatestFrom} from 'rxjs/operators';

import {countEcAll} from '@wm-core/store/features/ec/ec.selector';
import {
  confAPP,
  confHOME,
  confPROJECT,
  confOPTIONS,
  confMAP,
} from '@wm-core/store/conf/conf.selector';
import {
  IHOME,
  ILAYER,
  ILAYERBOX,
  IMAP,
  IOPTIONS,
  IPOITYPEFILTERBOX,
  ISLUGBOX,
} from '@wm-core/types/config';
import {APP} from '@wm-types/config';
import {WmInnerHtmlComponent} from '@wm-core/inner-html/inner-html.component';
import {countUgcAll, countUgcTracks} from '@wm-core/store/features/ugc/ugc.selector';
import {
  currentEcLayer,
  showResult,
  ugcOpened,
} from '@wm-core/store/user-activity/user-activity.selector';
import {
  closeDownloads,
  closeUgc,
  goToHome,
  inputTyped,
  openUgc,
  togglePoiFilter,
  setMapDetailsStatus,
  toggleTrackFilterByIdentifier,
  setHomeResultTabSelected,
} from '@wm-core/store/user-activity/user-activity.action';
import {WmSearchBarComponent} from '@wm-core/search-bar/search-bar.component';
import {loadEcPois} from '@wm-core/store/features/ec/ec.actions';
import {UrlHandlerService} from '@wm-core/services/url-handler.service';
import {online} from '@wm-core/store/network/network.selector';
@Component({
  selector: 'wm-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmHomeComponent implements AfterContentInit {
  @ViewChild('searchCmp') searchCmp: WmSearchBarComponent;

  confAPP$: Observable<APP> = this._store.select(confAPP);
  confMAP$: Observable<IMAP> = this._store.select(confMAP);
  confHOME$: Observable<IHOME[]> = this._store.select(confHOME);
  confOPTIONS$: Observable<IOPTIONS> = this._store.select(confOPTIONS);
  countAll$: Observable<number>;
  countEcAll$: Observable<number> = this._store.select(countEcAll);
  countUgcAll$: Observable<number> = this._store.select(countUgcAll);
  currentEcLayer$: Observable<ILAYER> = this._store.select(currentEcLayer);
  online$: Observable<boolean> = this._store.select(online);
  popup$: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  showResult$ = this._store.select(showResult);
  ugcOpened$ = this._store.select(ugcOpened);

  constructor(
    private _store: Store,
    private _route: ActivatedRoute,
    private _modalCtrl: ModalController,
    private _navCtrl: NavController,
    private _urlHandlerSvc: UrlHandlerService,
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
        if (params.filter != null && home[params.filter] != null) {
          const filterBox: IPOITYPEFILTERBOX = home[+params.filter] as IPOITYPEFILTERBOX;
          this.togglePoiFilter(filterBox.identifier);
        }
        if (params.slug != null && home[params.slug] != null) {
          const slugBox: ISLUGBOX = home[+params.slug] as ISLUGBOX;
          this.openSlug(slugBox.slug);
        }
      });
    this._store.dispatch(loadEcPois());
  }

  goToHome(): void {
    this._store.dispatch(goToHome());
  }

  closePopup(): void {
    this.popup$.next(null);
    this.goToHome();
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
                this._urlHandlerSvc.updateURL({slug: idx});
              }
            });
        });
    } else {
      this._navCtrl.navigateForward(slug);
    }
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

    this._urlHandlerSvc.updateURL({layer: layer?.id ?? undefined});
    this._store.dispatch(closeUgc());
    this._store.dispatch(closeDownloads());
    this._store.dispatch(setMapDetailsStatus({status: 'open'}));
    this._store.dispatch(setHomeResultTabSelected({tab: 'tracks'}));
  }

  setPoi(id: string | number): void {
    this._urlHandlerSvc.setPoi(id);
  }

  setSearch(value: string): void {
    this._store.dispatch(inputTyped({inputTyped: value}));
  }

  setTrack(id: string | number): void {
    this._urlHandlerSvc.setTrack(id);
  }

  setUgc(): void {
    this._store.dispatch(openUgc());
    this._store.dispatch(setMapDetailsStatus({status: 'open'}));
    //TODO: Da effettuare refactor spostare logica nell'effect
    this._store
      .select(countUgcTracks)
      .pipe(take(1))
      .subscribe(countTracks => {
        if (countTracks > 0) {
          this._store.dispatch(setHomeResultTabSelected({tab: 'tracks'}));
        }
      });
  }

  togglePoiFilter(filterIdentifier: string, idx?: number): void {
    this.setFilter({identifier: filterIdentifier, taxonomy: 'poi_types'});
    if (idx) {
      this._urlHandlerSvc.updateURL({filter: idx});
    }
  }
}
