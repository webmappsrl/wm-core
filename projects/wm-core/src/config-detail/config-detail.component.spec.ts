import {ConfigDetailComponent} from './config-detail.component';
import {ConfigDetailInfoBoxItem} from '@wm-types/config';
import {LangService} from '@wm-core/localization/lang.service';
import {ChangeDetectorRef, ElementRef} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {of} from 'rxjs';

describe('ConfigDetailComponent — apertura multipla (oc:8458)', () => {
  let component: ConfigDetailComponent;
  const itemA: ConfigDetailInfoBoxItem = {title: {it: 'STORIA'}, content: {it: 'Testo A'}};
  const itemB: ConfigDetailInfoBoxItem = {title: {it: 'ACQUA'}, content: {it: 'Testo B'}};
  const itemC: ConfigDetailInfoBoxItem = {title: {it: 'FLORA'}, content: {it: 'Testo C'}};

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
    const hostEl = document.createElement('div');
    return new ConfigDetailComponent(langSvcSpy, cdrSpy, sanitizerSpy, new ElementRef(hostEl));
  }

  beforeEach(() => {
    component = createComponent();
  });

  it('apre un item senza chiudere un item già aperto (multi-open)', () => {
    component.groups = [{box_type: 'info', items: [itemA, itemB]}];

    component.toggle(itemA);
    component.toggle(itemB);

    expect(component.isOpen(itemA)).toBeTrue();
    expect(component.isOpen(itemB)).toBeTrue();
  });

  it('richiudere un item aperto non tocca gli altri item aperti', () => {
    component.groups = [{box_type: 'info', items: [itemA, itemB]}];
    component.toggle(itemA);
    component.toggle(itemB);

    component.toggle(itemA);

    expect(component.isOpen(itemA)).toBeFalse();
    expect(component.isOpen(itemB)).toBeTrue();
  });

  it('non impone alcun limite al numero di item aperti simultaneamente', () => {
    component.groups = [{box_type: 'info', items: [itemA, itemB, itemC]}];

    component.toggle(itemA);
    component.toggle(itemB);
    component.toggle(itemC);

    expect(component.isOpen(itemA)).toBeTrue();
    expect(component.isOpen(itemB)).toBeTrue();
    expect(component.isOpen(itemC)).toBeTrue();
  });

  it('il setter groups resetta lo stato di apertura (istanza riusata per una nuova entità)', () => {
    component.groups = [{box_type: 'info', items: [itemA]}];
    component.toggle(itemA);
    expect(component.isOpen(itemA)).toBeTrue();

    component.groups = [{box_type: 'info', items: [itemB]}];

    expect(component.isOpen(itemA)).toBeFalse();
    expect(component.isOpen(itemB)).toBeFalse();
  });

  it('showLess chiude solo gli item nascosti del proprio gruppo, non gli item aperti in altri gruppi', () => {
    const groupExtraItems = Array.from({length: 12}, (_, i) => ({
      title: {it: `ITEM ${i}`},
      content: {it: `Testo ${i}`},
    }));
    component.groups = [
      {box_type: 'info', items: groupExtraItems},
      {box_type: 'info', items: [itemA]},
    ];
    component.showMore(0); // mostra tutti e 12 gli item del gruppo 0 (PAGE_SIZE=10)
    component.toggle(groupExtraItems[11]); // apre l'ultimo item del gruppo 0, oltre PAGE_SIZE
    component.toggle(itemA); // apre l'unico item del gruppo 1

    component.showLess(0); // torna a PAGE_SIZE=10 nel gruppo 0: item 11 non è più mostrato

    expect(component.isOpen(groupExtraItems[11])).toBeFalse();
    expect(component.isOpen(itemA)).toBeTrue();
  });

  it('showLess non chiude un item del proprio gruppo che resta visibile dopo la riduzione a PAGE_SIZE', () => {
    const groupExtraItems = Array.from({length: 12}, (_, i) => ({
      title: {it: `ITEM ${i}`},
      content: {it: `Testo ${i}`},
    }));
    component.groups = [{box_type: 'info', items: groupExtraItems}];
    component.showMore(0);
    component.toggle(groupExtraItems[2]); // dentro i primi PAGE_SIZE=10, resta visibile dopo showLess

    component.showLess(0);

    expect(component.isOpen(groupExtraItems[2])).toBeTrue();
  });
});
