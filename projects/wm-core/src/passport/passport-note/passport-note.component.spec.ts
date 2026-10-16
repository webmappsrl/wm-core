import {WmPassportNoteComponent, isNoteOverflowing} from './passport-note.component';

describe('WmPassportNoteComponent (oc:8671)', () => {
  function create(): WmPassportNoteComponent {
    return new WmPassportNoteComponent({markForCheck: jasmine.createSpy('markForCheck')} as any);
  }

  it('isNoteOverflowing: vero solo se il testo supera davvero lo spazio', () => {
    expect(isNoteOverflowing(60, 60)).toBeFalse();
    expect(isNoteOverflowing(61, 60)).toBeFalse();
    expect(isNoteOverflowing(90, 60)).toBeTrue();
  });

  it('toggle apre e chiude la nota', () => {
    const cmp = create();

    expect(cmp.expanded).toBeFalse();
    cmp.toggle();
    expect(cmp.expanded).toBeTrue();
    cmp.toggle();
    expect(cmp.expanded).toBeFalse();
  });

  it('senza troncamento «Leggi tutto» non compare', () => {
    const cmp = create();

    expect(cmp.showToggle).toBeFalse();
    cmp.overflowing = true;
    expect(cmp.showToggle).toBeTrue();
    cmp.overflowing = false;
    cmp.expanded = true;
    expect(cmp.showToggle).toBeTrue();
  });
});
