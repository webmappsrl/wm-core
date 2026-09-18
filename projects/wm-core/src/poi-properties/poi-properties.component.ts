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
import {normalizeRelatedUrls} from '@wm-core/related-urls/related-urls.component';
import {splitPhones} from '@wm-core/phone/split-phones';

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
      const {address} = derivePoiAddress(properties);
      return {...properties, address};
    }),
    tap(properties => {
      this.showTechnicalDetails$.next(!!properties?.ele);
    }),
    shareReplay({bufferSize: 1, refCount: true}),
  );
  /**
   * Le stesse properties senza `address`, derivate una volta per emissione e non a ogni ciclo di
   * change detection: `wm-tab-detail` è OnPush, e un oggetto nuovo ogni giro lo farebbe
   * ridisegnare ogni volta. L'indirizzo si legge solo nell'elenco dei contatti.
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
  /**
   * Se il gruppo "Informazioni" ha almeno una riga da mostrare. Serve solo a non lasciare il
   * titolo sospeso sopra il vuoto: `related_url` arriva come `[]` su 2.572 POI, e in JavaScript un
   * array vuoto è truthy, quindi un `*ngIf` sul campo non basterebbe.
   *
   * Ogni riga è chiesta alla stessa funzione che poi la disegna — `normalizeRelatedUrls` per i
   * link, `splitPhones` per i telefoni — invece di guardare il campo grezzo. Chiedere al campo
   * basterebbe per l'indirizzo e la mail, ma non per gli altri due: `related_url` arriva come `[]`,
   * e `contact_phone` può essere una stringa di sole etichette senza numeri
   * (`"Fixed Phone:,Cell Phone:,Other Phone:"`, forma vista in QA) che `splitPhones` scarta per
   * intero. In entrambi i casi il campo è truthy ma la riga non viene disegnata, e il titolo
   * resterebbe sospeso sopra una lista vuota.
   */
  hasContacts$: Observable<boolean> = this.currentPoiProperties$.pipe(
    map(
      properties =>
        !!(properties?.address || properties?.contact_email) ||
        splitPhones(properties?.contact_phone).length > 0 ||
        normalizeRelatedUrls(properties?.related_url).length > 0,
    ),
  );
  showTechnicalDetails$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(
    private _store: Store,
    private _geolocationSvc: GeolocationService,
    private _sanitizer: DomSanitizer,
  ) {}

  /**
   * Il blocco `info` arriva dalla configurazione, scritto dai content editor, non da input utente:
   * qui lo si marca come fidato per poterlo rendere con `innerHTML`.
   */
  sanitize(html: string) {
    return this._sanitizer.bypassSecurityTrustHtml(html);
  }

  /**
   * Le properties per `wm-tab-detail` senza `address`, così la riga "Indirizzo" resta solo fra i
   * contatti e non compare due volte.
   */
  omitAddress(properties: WmProperties): WmProperties {
    const {address: _address, ...rest} = properties;
    return rest as WmProperties;
  }
}

