import {ConfigDetailComponent} from './config-detail.component';
import {ConfigDetailInfoBoxItem, ConfigDetailToggleEvent} from '@wm-types/config';
import {LangService} from '@wm-core/localization/lang.service';
import {ChangeDetectorRef, ElementRef} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {of} from 'rxjs';

describe('ConfigDetailComponent — configDetailSettled (oc:8427)', () => {
  let component: ConfigDetailComponent;
  let hostEl: HTMLElement;
  let settledEvents: CustomEvent<ConfigDetailToggleEvent>[];
  const itemA: ConfigDetailInfoBoxItem = {title: {it: 'STORIA'}, content: {it: 'Testo lungo'}};
  const itemB: ConfigDetailInfoBoxItem = {title: {it: 'ACQUA'}, content: {it: 'Testo corto'}};

  function createComponent(): ConfigDetailComponent {
    const langSvcSpy = jasmine.createSpyObj<LangService>('LangService', ['instant']);
    (langSvcSpy as any).onLangChange = of();
    (langSvcSpy as any).currentLang = 'it';
    (langSvcSpy as any).defaultLang = 'it';
    const cdrSpy = jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['markForCheck']);
    const sanitizerSpy = jasmine.createSpyObj<DomSanitizer>('DomSanitizer', [
      'bypassSecurityTrustHtml',
    ]);
    sanitizerSpy.bypassSecurityTrustHtml.and.callFake((v: string) => v as any);
    hostEl = document.createElement('div');
    settledEvents = [];
    hostEl.addEventListener('configDetailSettled', ev =>
      settledEvents.push(ev as CustomEvent<ConfigDetailToggleEvent>),
    );
    return new ConfigDetailComponent(langSvcSpy, cdrSpy, sanitizerSpy, new ElementRef(hostEl));
  }

  function dispatchTransitionEnd(propertyName = 'grid-template-rows'): void {
    // Simula il bubbling reale: la transizione avviene sul wrapper del contenuto (target),
    // il listener è sull'host (dove l'evento arriva in bubbling) — il componente ora verifica
    // anche `ev.target` per ignorare `transitionend` spuri originati da contenuto HTML iniettato.
    const wrapper = document.createElement('div');
    wrapper.className = 'wm-config-detail-content-wrapper';
    hostEl.appendChild(wrapper);
    wrapper.dispatchEvent(
      Object.assign(new Event('transitionend', {bubbles: true}), {propertyName}),
    );
  }

  beforeEach(() => {
    jasmine.clock().install();
    component = createComponent();
    component.groups = [{box_type: 'info', items: [itemA, itemB]}];
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('dispaccia configDetailSettled con {opening: true, headerElement} dopo transitionend + debounce di assestamento', () => {
    const fakeButton = document.createElement('button');
    component.toggle(itemA, {currentTarget: fakeButton} as unknown as Event);
    dispatchTransitionEnd();

    expect(settledEvents.length).toBe(0);
    jasmine.clock().tick(50);

    expect(settledEvents.length).toBe(1);
    expect(settledEvents[0].bubbles).toBeTrue();
    expect(settledEvents[0].composed).toBeTrue();
    expect(settledEvents[0].detail).toEqual({opening: true, headerElement: fakeButton});
    expect(component.isOpen(itemA)).toBeTrue();
  });

  it('dispaccia {opening: false, headerElement: null} quando richiude lo stesso item', () => {
    const fakeButton = document.createElement('button');
    component.toggle(itemA, {currentTarget: fakeButton} as unknown as Event);
    dispatchTransitionEnd();
    jasmine.clock().tick(50);
    settledEvents = [];

    component.toggle(itemA, {currentTarget: fakeButton} as unknown as Event);
    dispatchTransitionEnd();
    jasmine.clock().tick(50);

    expect(settledEvents.length).toBe(1);
    expect(settledEvents[0].detail).toEqual({opening: false, headerElement: null});
    expect(component.isOpen(itemA)).toBeFalse();
  });

  it('usa il fallback a timeout se transitionend non arriva mai (transizione interrotta)', () => {
    const fakeButton = document.createElement('button');
    component.toggle(itemA, {currentTarget: fakeButton} as unknown as Event);

    jasmine.clock().tick(399);
    expect(settledEvents.length).toBe(0);

    jasmine.clock().tick(1);
    expect(settledEvents.length).toBe(1);
    expect(settledEvents[0].detail).toEqual({opening: true, headerElement: fakeButton});
  });

  it('ignora transitionend di proprietà diverse da grid-template-rows', () => {
    const fakeButton = document.createElement('button');
    component.toggle(itemA, {currentTarget: fakeButton} as unknown as Event);
    dispatchTransitionEnd('border-color');
    jasmine.clock().tick(50);

    expect(settledEvents.length).toBe(0);

    dispatchTransitionEnd('grid-template-rows');
    jasmine.clock().tick(50);

    expect(settledEvents.length).toBe(1);
  });

  it('due transitionend pertinenti ravvicinati (chiusura+apertura simultanee) resettano il debounce: un solo dispatch, dopo l\'ultimo evento', () => {
    const fakeButton = document.createElement('button');
    component.toggle(itemA, {currentTarget: fakeButton} as unknown as Event);

    dispatchTransitionEnd(); // fine transizione di chiusura di un item precedente
    jasmine.clock().tick(30);
    expect(settledEvents.length).toBe(0);

    dispatchTransitionEnd(); // fine transizione di apertura dell'item corrente, arrivata poco dopo
    jasmine.clock().tick(30);
    expect(settledEvents.length).toBe(0); // 60ms dal primo evento, ma solo 30ms dal secondo

    jasmine.clock().tick(20);
    expect(settledEvents.length).toBe(1);
  });

  it('un secondo toggle ravvicinato (prima che il primo si assesti) annulla il primo: un solo dispatch, con lo stato finale', () => {
    const buttonA = document.createElement('button');
    const buttonB = document.createElement('button');

    component.toggle(itemA, {currentTarget: buttonA} as unknown as Event);
    component.toggle(itemB, {currentTarget: buttonB} as unknown as Event);
    dispatchTransitionEnd();
    jasmine.clock().tick(50);

    expect(settledEvents.length).toBe(1);
    expect(settledEvents[0].detail).toEqual({opening: true, headerElement: buttonB});
    expect(component.isOpen(itemA)).toBeFalse();
    expect(component.isOpen(itemB)).toBeTrue();
  });

  it('due toggle in sequenza, ciascuno assestato prima del successivo, dispacciano due eventi distinti', () => {
    const buttonA = document.createElement('button');
    const buttonB = document.createElement('button');

    component.toggle(itemA, {currentTarget: buttonA} as unknown as Event);
    dispatchTransitionEnd();
    jasmine.clock().tick(50);

    component.toggle(itemB, {currentTarget: buttonB} as unknown as Event);
    dispatchTransitionEnd();
    jasmine.clock().tick(50);

    expect(settledEvents.length).toBe(2);
    expect(settledEvents[0].detail).toEqual({opening: true, headerElement: buttonA});
    expect(settledEvents[1].detail).toEqual({opening: true, headerElement: buttonB});
  });

  it('dispaccia anche senza un evento click (chiamata programmatica), con headerElement null', () => {
    component.toggle(itemA);
    dispatchTransitionEnd();
    jasmine.clock().tick(50);

    expect(settledEvents[0].detail).toEqual({opening: true, headerElement: null});
  });

  it('ignora un transitionend con propertyName pertinente ma originato da un elemento che non è il wrapper del contenuto (es. contenuto HTML iniettato con una propria transizione)', () => {
    const fakeButton = document.createElement('button');
    component.toggle(itemA, {currentTarget: fakeButton} as unknown as Event);

    const spuriousSource = document.createElement('div'); // niente classe wm-config-detail-content-wrapper
    hostEl.appendChild(spuriousSource);
    spuriousSource.dispatchEvent(
      Object.assign(new Event('transitionend', {bubbles: true}), {
        propertyName: 'grid-template-rows',
      }),
    );
    jasmine.clock().tick(50);

    expect(settledEvents.length).toBe(0); // nessun transitionend pertinente ricevuto, il debounce non è mai partito

    dispatchTransitionEnd(); // quello vero, dal wrapper
    jasmine.clock().tick(50);

    expect(settledEvents.length).toBe(1);
  });

  it('showLess() annulla un toggle in attesa di assestamento: nessun evento dispacciato per un\'apertura non più valida', () => {
    const fakeButton = document.createElement('button');
    component.toggle(itemA, {currentTarget: fakeButton} as unknown as Event);

    component.showLess(0);
    dispatchTransitionEnd();
    jasmine.clock().tick(400);

    expect(settledEvents.length).toBe(0);
    expect(component.isOpen(itemA)).toBeFalse();
  });

  it('il setter groups annulla un toggle in attesa di assestamento (istanza riusata per una nuova entità)', () => {
    const fakeButton = document.createElement('button');
    component.toggle(itemA, {currentTarget: fakeButton} as unknown as Event);

    component.groups = [{box_type: 'info', items: [itemB]}];
    dispatchTransitionEnd();
    jasmine.clock().tick(400);

    expect(settledEvents.length).toBe(0);
  });

  it('ngOnDestroy rimuove il listener e cancella i timer pendenti: nessun dispatch dopo la distruzione', () => {
    const removeSpy = spyOn(hostEl, 'removeEventListener').and.callThrough();
    component.toggle(itemA, {currentTarget: document.createElement('button')} as unknown as Event);

    component.ngOnDestroy();
    jasmine.clock().tick(400);

    expect(settledEvents.length).toBe(0);
    expect(removeSpy).toHaveBeenCalledWith('transitionend', jasmine.any(Function));
  });
});
