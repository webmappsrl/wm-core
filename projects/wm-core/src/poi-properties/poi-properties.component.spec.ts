import {DomSanitizer} from '@angular/platform-browser';
import {Store} from '@ngrx/store';
import {of} from 'rxjs';

import {GeolocationService} from '@wm-core/services/geolocation.service';
import {currentPoiProperties} from '@wm-core/store/features/ec/ec.selector';
import {poi} from '@wm-core/store/features/features.selector';
import {confOPTIONSShowEmbeddedHtml, confPOIFORMS} from '@wm-core/store/conf/conf.selector';

import {PoiPropertiesComponent} from './poi-properties.component';

/**
 * Plain TS instance tests (no TestBed) — same pattern as ugc-track-properties.spec
 * to avoid NG0201 on APP_TRANSLATION when compiling templates.
 */
describe('PoiPropertiesComponent (oc:8406)', () => {
  let storeSpy: jasmine.SpyObj<Store>;
  let geolocationSpy: jasmine.SpyObj<GeolocationService>;
  let sanitizerSpy: jasmine.SpyObj<DomSanitizer>;
  let component: PoiPropertiesComponent;

  function createComponent(properties: any): PoiPropertiesComponent {
    storeSpy = jasmine.createSpyObj<Store>('Store', ['select']);
    storeSpy.select.and.callFake((selector: any) => {
      if (selector === currentPoiProperties) {
        return of(properties);
      }
      if (selector === poi) {
        return of(null);
      }
      if (selector === confOPTIONSShowEmbeddedHtml || selector === confPOIFORMS) {
        return of(null);
      }
      return of(null);
    });
    geolocationSpy = jasmine.createSpyObj('GeolocationService', [
      'getDistanceFromCurrentLocation$',
    ]);
    geolocationSpy.getDistanceFromCurrentLocation$.and.returnValue(of(null));
    sanitizerSpy = jasmine.createSpyObj('DomSanitizer', ['bypassSecurityTrustHtml']);
    sanitizerSpy.bypassSecurityTrustHtml.and.callFake((v: string) => v as any);
    return new PoiPropertiesComponent(storeSpy, geolocationSpy, sanitizerSpy);
  }

  it('deriva address da addr_complete e non apre i dettagli tecnici senza ele', done => {
    component = createComponent({
      addr_complete: 'Via Roma 1, Pisa',
      contact_phone: null,
      contact_email: null,
      related_url: null,
    });
    component.currentPoiProperties$.subscribe(props => {
      expect(props?.address).toBe('Via Roma 1, Pisa');
      expect(component.showTechnicalDetails$.value).toBeFalse();
      done();
    });
  });

  it('ele apre i dettagli tecnici', done => {
    component = createComponent({
      contact_phone: '111, 222',
      ele: 100,
    });
    component.currentPoiProperties$.subscribe(() => {
      expect(component.showTechnicalDetails$.value).toBeTrue();
      done();
    });
  });

  // Contatti e link utili non hanno più un gate proprio (scrum del 04/09/2026): l'elenco è unico
  // e senza etichette, quindi ogni figlio si nasconde da sé e non c'è uno stato da calcolare in
  // anticipo. Resta solo showTechnicalDetails$, che già esisteva nella mobile.
  it('related_url non apre i dettagli tecnici', done => {
    component = createComponent({
      related_url: {Sito: 'https://example.com'},
      contact_phone: null,
      contact_email: null,
    });
    component.currentPoiProperties$.subscribe(() => {
      expect(component.showTechnicalDetails$.value).toBeFalse();
      done();
    });
  });

  describe('hasContacts$ — il titolo non deve restare orfano', () => {
    const cases: [string, any, boolean][] = [
      ['solo indirizzo', {addr_complete: 'Via Roma 1, Pisa'}, true],
      ['solo telefono', {contact_phone: '06 111'}, true],
      ['solo mail', {contact_email: 'a@b.it'}, true],
      ['solo link come oggetto', {related_url: {Sito: 'https://example.com'}}, true],
      ['solo link come stringa', {related_url: 'https://example.com'}, true],
      // Il caso che rendeva il titolo sospeso sopra il vuoto: `[]` è truthy in JavaScript, e
      // arriva così su 2.572 POI.
      ['related_url array vuoto', {related_url: []}, false],
      ['related_url oggetto vuoto', {related_url: {}}, false],
      ['related_url con sola chiave vuota', {related_url: {'': 'https://example.com'}}, false],
      ['niente del tutto', {}, false],
    ];

    cases.forEach(([label, properties, expected]) => {
      it(`${label} \u2192 ${expected}`, done => {
        component = createComponent(properties);
        component.hasContacts$.subscribe(result => {
          expect(result).toBe(expected);
          done();
        });
      });
    });
  });

  it('technicalProperties$ e\u0300 la sorgente di wm-tab-detail e non contiene address', done => {
    component = createComponent({
      addr_complete: 'Via Roma 1, Pisa',
      ele: 120,
    });
    component.technicalProperties$.subscribe(props => {
      expect(props?.address).toBeUndefined();
      expect(props?.ele).toBe(120);
      done();
    });
  });

  it('technicalProperties$ deriva una sola volta per emissione, non a ogni lettura', done => {
    component = createComponent({addr_complete: 'Via Roma 1, Pisa', ele: 120});
    component.technicalProperties$.subscribe(first => {
      component.technicalProperties$.subscribe(second => {
        expect(second).toBe(first);
        done();
      });
    });
  });

  it('omitAddress rimuove address dalle properties per wm-tab-detail', () => {
    component = createComponent({});
    const result = component.omitAddress({
      address: 'Via Roma',
      ele: 10,
      uuid: 'x',
    } as any);
    expect(result.address).toBeUndefined();
    expect(result.ele).toBe(10);
  });
});
