import {SelectFilterComponent} from './select-filter.component';

describe('SelectFilterComponent', () => {
  // Costruito con `new` per evitare NG0201 (vedi .claude/rules/spec-e-testbed.md)
  let component: SelectFilterComponent;

  beforeEach(() => {
    component = new SelectFilterComponent(null as any);
  });

  describe('isPoiOptionVisible', () => {
    it('mostra la voce se ha un conteggio', () => {
      expect(component.isPoiOptionVisible('a', {a: 3}, [])).toBeTrue();
    });

    it('nasconde la voce senza conteggio e non selezionata', () => {
      expect(component.isPoiOptionVisible('a', {b: 3}, ['c'])).toBeFalse();
    });

    it('mostra la voce selezionata anche senza conteggio', () => {
      expect(component.isPoiOptionVisible('a', {b: 3}, ['a'])).toBeTrue();
    });

    it('accetta anche le opzioni selezionate come oggetti con identifier', () => {
      expect(component.isPoiOptionVisible('a', {}, [{identifier: 'a'}])).toBeTrue();
    });
  });
});
