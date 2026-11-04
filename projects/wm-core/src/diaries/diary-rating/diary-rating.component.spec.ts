import {ComponentFixture, TestBed} from '@angular/core/testing';
import {FakeTransPipe, fakeLangService} from '@wm-core/passport/testing/fake-trans';
import {LangService} from '@wm-core/localization/lang.service';
import {WmDiaryRatingComponent} from './diary-rating.component';

describe('WmDiaryRatingComponent (oc:8169)', () => {
  let fixture: ComponentFixture<WmDiaryRatingComponent>;
  let cmp: WmDiaryRatingComponent;
  let animateSpy: jasmine.Spy;
  let reducedMotion: boolean;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    reducedMotion = false;
    spyOn(window, 'matchMedia').and.callFake(
      (query: string) => ({matches: query.includes('reduce') && reducedMotion}) as MediaQueryList,
    );
    animateSpy = spyOn(Element.prototype, 'animate').and.callFake(
      () => ({cancel: () => undefined, finished: Promise.resolve()}) as unknown as Animation,
    );
    await TestBed.configureTestingModule({
      declarations: [WmDiaryRatingComponent, FakeTransPipe],
      providers: [{provide: LangService, useValue: fakeLangService()}],
    }).compileComponents();
    fixture = TestBed.createComponent(WmDiaryRatingComponent);
    cmp = fixture.componentInstance;
    cmp.label = 'Ospitalità';
  });

  afterEach(() => TestBed.resetTestingModule());

  /** @returns i pulsanti dei cinque timbri */
  function buttons(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('button.wm-diary-rating-stamp'));
  }

  /** @returns quanti timbri sono pieni */
  function filled(): number {
    return fixture.nativeElement.querySelectorAll('.wm-diary-rating-stamp--on').length;
  }

  it('mostra cinque timbri, pieni fino al valore', () => {
    cmp.value = 3;
    fixture.detectChanges();

    expect(buttons().length).toBe(5);
    expect(filled()).toBe(3);
  });

  it('il tocco su un timbro emette il suo valore', () => {
    const emitted: (number | null)[] = [];
    cmp.valueChange.subscribe(v => emitted.push(v));
    fixture.detectChanges();

    buttons()[2].click();

    expect(emitted).toEqual([3]);
    expect(filled()).toBe(3);
  });

  it('il tocco sul valore già scelto lo azzera', () => {
    const emitted: (number | null)[] = [];
    cmp.value = 3;
    cmp.valueChange.subscribe(v => emitted.push(v));
    fixture.detectChanges();

    buttons()[2].click();

    expect(emitted).toEqual([null]);
    expect(filled()).toBe(0);
  });

  it('in sola lettura non ci sono pulsanti e non emette', () => {
    cmp.value = 4;
    cmp.readonly = true;
    fixture.detectChanges();

    expect(buttons().length).toBe(0);
    expect(filled()).toBe(4);
  });

  it('al primo render con un valore salvato non anima nulla', () => {
    cmp.value = 4;
    fixture.detectChanges();

    expect(animateSpy).not.toHaveBeenCalled();
  });

  it('al tocco anima solo i timbri che diventano pieni, uno dopo l\'altro', () => {
    cmp.value = 1;
    fixture.detectChanges();

    buttons()[3].click();

    expect(animateSpy).toHaveBeenCalledTimes(3);
    const delays = animateSpy.calls.all().map(c => (c.args[1] as KeyframeAnimationOptions).delay);
    expect(delays).toEqual([0, 60, 120]);
  });

  it('abbassando il valore i timbri tolti si spengono con una dissolvenza', () => {
    cmp.value = 4;
    fixture.detectChanges();

    buttons()[1].click();

    expect(animateSpy).toHaveBeenCalledTimes(2);
    const keyframes = animateSpy.calls.argsFor(0)[0] as Keyframe[];
    expect(keyframes.every(k => k['transform'] == null)).toBeTrue();
  });

  it('con la riduzione del movimento non anima', () => {
    reducedMotion = true;
    fixture.detectChanges();

    buttons()[4].click();

    expect(animateSpy).not.toHaveBeenCalled();
    expect(filled()).toBe(5);
  });

  it('ogni pulsante ha un nome accessibile con etichetta e valore', () => {
    fixture.detectChanges();

    expect(buttons()[1].getAttribute('aria-label')).toBe('Ospitalità: 2 su 5');
    expect(buttons()[1].getAttribute('aria-pressed')).toBe('false');
  });
});
