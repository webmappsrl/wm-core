import {Component, ChangeDetectionStrategy, ViewEncapsulation} from '@angular/core';
import {UntypedFormGroup} from '@angular/forms';
import {DomSanitizer} from '@angular/platform-browser';
import {Store} from '@ngrx/store';
import {BehaviorSubject, Observable} from 'rxjs';
import {map, shareReplay, switchMap, tap} from 'rxjs/operators';

import {GeolocationService} from '@wm-core/services/geolocation.service';
import {confOPTIONSShowEmbeddedHtml, confPOIFORMS} from '@wm-core/store/conf/conf.selector';
import {currentPoiProperties} from '@wm-core/store/features/ec/ec.selector';
import {poi} from '@wm-core/store/features/features.selector';
import {WmProperties} from '@wm-types/feature';
import {derivePoiAddress} from '@wm-core/utils/derive-poi-address';

@Component({
  standalone: false,
  selector: 'wm-poi-properties',
  templateUrl: './poi-properties.component.html',
  styleUrls: ['./poi-properties.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class PoiPropertiesComponent {
  confOPTIONSShowEmbeddedHtml$ = this._store.select(confOPTIONSShowEmbeddedHtml);
  confPOIFORMS$: Observable<any[]> = this._store.select(confPOIFORMS);
  formGroup: UntypedFormGroup;
  currentPoiProperties$ = this._store.select(currentPoiProperties).pipe(
    map(properties => {
      if (properties == null) {
        return properties;
      }
      const {address, address_link} = derivePoiAddress(properties);
      return {...properties, address, address_link};
    }),
    tap(properties => {
      this.showTechnicalDetails$.next(!!properties?.ele);
      this.showContacts$.next(
        !!(properties?.address || properties?.contact_phone || properties?.contact_email),
      );
      this.showUsefulUrls$.next(!!properties?.related_url);
    }),
    shareReplay({bufferSize: 1, refCount: true}),
  );
  /**
   * Same properties without `address`, derived once per emission instead of on every
   * change detection: `wm-tab-detail` is OnPush and a new object each cycle would make
   * it re-render every time. Indirizzo lives in the contacts group only.
   */
  technicalProperties$: Observable<WmProperties> = this.currentPoiProperties$.pipe(
    map(properties => (properties == null ? properties : this.omitAddress(properties))),
    shareReplay({bufferSize: 1, refCount: true}),
  );
  distanceFromCurrentPoi$ = this._store
    .select(poi)
    .pipe(
      switchMap(currentPoi =>
        this._geolocationSvc.getDistanceFromCurrentLocation$(currentPoi?.geometry?.coordinates),
      ),
    );
  showContacts$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  showTechnicalDetails$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  showUsefulUrls$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(
    private _store: Store,
    private _geolocationSvc: GeolocationService,
    private _sanitizer: DomSanitizer,
  ) {}

  /**
   * Trusts HTML from conf/content editors for the info block.
   */
  sanitize(html: string) {
    return this._sanitizer.bypassSecurityTrustHtml(html);
  }

  /**
   * Properties for `wm-tab-detail` without `address`, so Indirizzo stays in contacts only.
   */
  omitAddress(properties: WmProperties): WmProperties {
    const {address: _address, ...rest} = properties;
    return rest as WmProperties;
  }
}
