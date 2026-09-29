import {BehaviorSubject, of} from 'rxjs';
import {switchMap} from 'rxjs/operators';
import {WmPassportLogoRingDirective} from './passport-logo-ring.directive';

describe('WmPassportLogoRingDirective (oc:8166)', () => {
  let el: HTMLElement;
  let logged$: BehaviorSubject<boolean>;

  function create(progress: any, layerId: string | number = '55') {
    el = document.createElement('div');
    logged$ = new BehaviorSubject(true);
    const visibleProgress = () =>
      logged$.pipe(switchMap(l => of(l && progress?.totalStages > 0 ? progress : null)));
    const dir = new WmPassportLogoRingDirective({nativeElement: el} as any, {visibleProgress} as any);
    dir.layerId = layerId;
    dir.ngOnChanges();
    return dir;
  }

  it("utente loggato con tappe: disegna l'anello con l'arco proporzionale", () => {
    const dir = create({totalStages: 13, completedStages: 8, percent: 62});

    expect(el.classList).toContain('wm-passport-logo-ring');
    expect(el.style.getPropertyValue('--wm-passport-ring-deg')).toBe('223.2deg');
    dir.ngOnDestroy();
  });

  it('a 0% la classe c\'è ma l\'arco è nullo, come nel wireframe V0b', () => {
    const dir = create({totalStages: 12, completedStages: 0, percent: 0});

    expect(el.classList).toContain('wm-passport-logo-ring');
    expect(el.style.getPropertyValue('--wm-passport-ring-deg')).toBe('0deg');
    dir.ngOnDestroy();
  });

  it('layer senza tappe: nessun anello', () => {
    const dir = create({totalStages: 0, completedStages: 0, percent: 0});

    expect(el.classList).not.toContain('wm-passport-logo-ring');
    dir.ngOnDestroy();
  });

  it("al logout l'anello sparisce", () => {
    const dir = create({totalStages: 13, completedStages: 8, percent: 62});

    logged$.next(false);

    expect(el.classList).not.toContain('wm-passport-logo-ring');
    expect(el.style.getPropertyValue('--wm-passport-ring-deg')).toBe('');
    dir.ngOnDestroy();
  });
});
