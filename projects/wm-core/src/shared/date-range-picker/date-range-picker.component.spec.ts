import {ComponentFixture, TestBed} from '@angular/core/testing';
import {CUSTOM_ELEMENTS_SCHEMA} from '@angular/core';
import {CommonModule} from '@angular/common';
import {LangService} from '@wm-core/localization/lang.service';
import {FakeTransPipe, fakeLangService} from '@wm-core/passport/testing/fake-trans';
import {WmDateRangePickerComponent} from './date-range-picker.component';
import {DateRange} from './date-range.utils';

describe('WmDateRangePickerComponent (oc:8169, ciclo 4)', () => {
  let fixture: ComponentFixture<WmDateRangePickerComponent>;
  let cmp: WmDateRangePickerComponent;
  let emitted: (DateRange | null)[];

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [CommonModule],
      declarations: [WmDateRangePickerComponent, FakeTransPipe],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [{provide: LangService, useValue: {...fakeLangService(), currentLang: 'it'}}],
    }).compileComponents();
    fixture = TestBed.createComponent(WmDateRangePickerComponent);
    cmp = fixture.componentInstance;
    cmp.max = '2026-11-04';
    emitted = [];
    cmp.valueChange.subscribe(v => emitted.push(v));
  });

  afterEach(() => TestBed.resetTestingModule());

  const field = (): HTMLElement => fixture.nativeElement.querySelector('.wm-date-range-field');

  it('il campo mostra l\'intervallo o il segnaposto', () => {
    cmp.placeholder = 'Scegli le date';
    fixture.detectChanges();
    expect(field().textContent).toContain('Scegli le date');
    fixture.componentRef.setInput('value', {start: '2026-05-10', end: '2026-05-12'});
    fixture.detectChanges();
    expect(field().textContent).toContain('10 – 12 maggio 2026');
  });

  it('due tocchi e «Conferma» emettono l\'intervallo, colorando i giorni in mezzo', () => {
    fixture.detectChanges();
    field().click();
    expect(cmp.isOpen).toBeTrue();
    cmp.onCalendarChange(['2026-05-10']);
    cmp.onCalendarChange(['2026-05-10', '2026-05-13']);
    expect(cmp.highlighted.map(h => h.date)).toEqual(['2026-05-11', '2026-05-12']);
    expect(cmp.summary).toEqual({key: 'Dal {{from}} al {{to}}', params: {from: '10 maggio', to: '13 maggio'}});
    cmp.confirm();
    expect(emitted).toEqual([{start: '2026-05-10', end: '2026-05-13'}]);
    expect(cmp.isOpen).toBeFalse();
  });

  it('il secondo tocco sullo stesso giorno (deseleziona in Ionic) chiude un giorno solo', () => {
    fixture.detectChanges();
    cmp.open();
    cmp.onCalendarChange(['2026-05-10']);
    cmp.onCalendarChange([]);
    expect(cmp.summary).toEqual({key: 'Solo il {{day}}', params: {day: '10 maggio'}});
    expect(cmp.selected).toEqual(['2026-05-10']);
    cmp.confirm();
    expect(emitted).toEqual([{start: '2026-05-10', end: '2026-05-10'}]);
  });

  it('il terzo tocco ricomincia', () => {
    fixture.detectChanges();
    cmp.open();
    cmp.onCalendarChange(['2026-05-10']);
    cmp.onCalendarChange(['2026-05-10', '2026-05-12']);
    cmp.onCalendarChange(['2026-05-10', '2026-05-12', '2026-06-01']);
    expect(cmp.selected).toEqual(['2026-06-01']);
    expect(cmp.highlighted).toEqual([]);
  });

  it('riaprire il foglio mentre si chiude non viene annullato dal didDismiss precedente', () => {
    fixture.detectChanges();
    cmp.open();
    cmp.cancel();
    cmp.open();
    cmp.onDismiss();
    expect(cmp.isOpen).toBeTrue();
  });

  it('chiuso trascinando o toccando lo sfondo, il foglio risulta chiuso', () => {
    fixture.detectChanges();
    cmp.open();
    cmp.onDismiss();
    expect(cmp.isOpen).toBeFalse();
  });

  it('«Annulla» non emette, svuota emette null', () => {
    cmp.value = {start: '2026-05-10', end: '2026-05-10'};
    cmp.clearable = true;
    fixture.detectChanges();
    cmp.open();
    cmp.onCalendarChange(['2026-05-10', '2026-05-20']);
    cmp.cancel();
    expect(emitted).toEqual([]);
    (fixture.nativeElement.querySelector('.wm-date-range-clear') as HTMLElement).click();
    expect(emitted).toEqual([null]);
  });
});
