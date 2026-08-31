import {WmHomeComponent} from './home.component';
import {Store} from '@ngrx/store';
import {ActivatedRoute} from '@angular/router';
import {ModalController, NavController} from '@ionic/angular';
import {UrlHandlerService} from '@wm-core/services/url-handler.service';
import {of} from 'rxjs';

describe('WmHomeComponent — consumer semplice configDetailSettled (oc:8427)', () => {
  function createComponent(): WmHomeComponent {
    const storeSpy = jasmine.createSpyObj<Store>('Store', ['select']);
    storeSpy.select.and.returnValue(of(null));
    const routeStub = {queryParams: of({})} as unknown as ActivatedRoute;
    return new WmHomeComponent(
      storeSpy,
      routeStub,
      {} as ModalController,
      {} as NavController,
      {} as UrlHandlerService,
    );
  }

  function settledEvent(detail: {opening: boolean; headerElement: HTMLElement | null}): Event {
    return new CustomEvent('configDetailSettled', {detail});
  }

  it('chiama scrollIntoView (nearest, smooth) quando l\'header non è già visibile e l\'evento è di apertura', () => {
    const component = createComponent();
    const fakeHeader = document.createElement('button');
    spyOn(fakeHeader, 'scrollIntoView');
    spyOn<any>(component, '_isFullyInView').and.returnValue(false);

    component.onConfigDetailSettled(settledEvent({opening: true, headerElement: fakeHeader}));

    expect(fakeHeader.scrollIntoView).toHaveBeenCalledWith({block: 'nearest', behavior: 'smooth'});
  });

  it('non chiama scrollIntoView quando l\'header è già interamente visibile', () => {
    const component = createComponent();
    const fakeHeader = document.createElement('button');
    spyOn(fakeHeader, 'scrollIntoView');
    spyOn<any>(component, '_isFullyInView').and.returnValue(true);

    component.onConfigDetailSettled(settledEvent({opening: true, headerElement: fakeHeader}));

    expect(fakeHeader.scrollIntoView).not.toHaveBeenCalled();
  });

  it('non chiama scrollIntoView quando l\'evento è di chiusura', () => {
    const component = createComponent();
    const fakeHeader = document.createElement('button');
    spyOn(fakeHeader, 'scrollIntoView');

    component.onConfigDetailSettled(settledEvent({opening: false, headerElement: null}));

    expect(fakeHeader.scrollIntoView).not.toHaveBeenCalled();
  });
});

describe('WmHomeComponent — _isFullyInView (oc:8427)', () => {
  let container: HTMLDivElement;
  let header: HTMLDivElement;
  let component: WmHomeComponent;

  beforeEach(() => {
    const storeSpy = jasmine.createSpyObj<Store>('Store', ['select']);
    storeSpy.select.and.returnValue(of(null));
    const routeStub = {queryParams: of({})} as unknown as ActivatedRoute;
    component = new WmHomeComponent(
      storeSpy,
      routeStub,
      {} as ModalController,
      {} as NavController,
      {} as UrlHandlerService,
    );

    container = document.createElement('div');
    container.style.cssText = 'position:fixed; top:0; left:0; width:10px; height:100px; overflow-y:auto;';
    const spacerBefore = document.createElement('div');
    spacerBefore.style.height = '50px';
    header = document.createElement('div');
    header.style.height = '20px';
    const spacerAfter = document.createElement('div');
    spacerAfter.style.height = '200px';
    container.append(spacerBefore, header, spacerAfter);
    document.body.appendChild(container);
  });

  afterEach(() => container.remove());

  it('ritorna true se l\'header è interamente contenuto nel viewport del container scrollabile', () => {
    container.scrollTop = 0;

    expect((component as any)._isFullyInView(header)).toBeTrue();
  });

  it('ritorna false se l\'header è solo parzialmente visibile (tagliato in alto)', () => {
    container.scrollTop = 60;

    expect((component as any)._isFullyInView(header)).toBeFalse();
  });

  it('ritorna false se l\'header è completamente fuori dal viewport del container', () => {
    container.scrollTop = 100;

    expect((component as any)._isFullyInView(header)).toBeFalse();
  });
});
