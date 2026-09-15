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
      this.showUsefulUrls$.next(hasUsableRelatedUrls(properties?.related_url));
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
  /**
   * Il comune del POI, mostrato sopra il nome (oc:8406). Prima lì stava la categoria
   * (`taxonomy.poi_type`), sostituita su richiesta esplicita del dev.
   *
   * La sorgente è `taxonomyWheres` e **non** `taxonomy_where`: quest'ultimo — il campo tipizzato
   * che `wm-txn-where` consuma — è vuoto su tutti i POI delle app verificate (0 su 3.252
   * dell'app 33, 0 su 3.721 dell'app 29), mentre `taxonomyWheres` è popolato su 3.251 e 3.203.
   *
   * È un array di stringhe ordinato dal generale allo specifico — regione, provincia, comune —
   * quindi si prende l'ultimo elemento. Mostrare tutti i livelli concatenati occuperebbe due
   * righe nel popup della webapp, che a 1024px di viewport è largo ~205px.
   */
  municipality$: Observable<string | null> = this.currentPoiProperties$.pipe(
    map(properties => {
      const wheres = properties?.taxonomyWheres;
      if (!Array.isArray(wheres) || wheres.length === 0) {
        return null;
      }
      const last = wheres[wheres.length - 1];
      return typeof last === 'string' && last.trim() !== '' ? last.trim() : null;
    }),
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

/**
 * `true` solo se `related_url` porta almeno un link mostrabile.
 *
 * `!!related_url` non bastava: il backend invia `[]` su **2.572 POI** e **2.796 EcTrack**
 * (misurato su db_prod), e `![]` è `false`, quindi il blocco "Link utili" compariva col solo
 * titolo e nessuna riga — il titolo in `feature-useful-urls.component.html:1` non ha `*ngIf`.
 * L'oggetto vuoto `{}` invece **non esiste nei dati** (0 record su POI e track): non è quello il
 * caso da coprire.
 *
 * Le forme accettate sono una conseguenza deterministica di `EcPoi::getJson()`
 * (`geohub/app/Models/EcPoi.php:282`), che rimuove il campo solo se `!is_array && empty`: `false`
 * e `""` spariscono dal payload, mentre una stringa non vuota sopravvive e arriva al client come
 * stringa (76 POI sull'app 29). Le voci con etichetta vuota vengono scartate: 100 POI hanno una
 * chiave `""`, che renderebbe una riga senza testo.
 *
 * @param relatedUrl Il valore grezzo di `properties.related_url`.
 * @returns `true` se esiste almeno un link con etichetta e URL non vuoti.
 */
export function hasUsableRelatedUrls(relatedUrl: unknown): boolean {
  if (relatedUrl == null) {
    return false;
  }
  if (typeof relatedUrl === 'string') {
    return relatedUrl.trim() !== '';
  }
  if (Array.isArray(relatedUrl)) {
    return relatedUrl.some(url => typeof url === 'string' && url.trim() !== '');
  }
  if (typeof relatedUrl === 'object') {
    return Object.entries(relatedUrl as Record<string, unknown>).some(
      ([label, url]) => label.trim() !== '' && typeof url === 'string' && url.trim() !== '',
    );
  }
  return false;
}
