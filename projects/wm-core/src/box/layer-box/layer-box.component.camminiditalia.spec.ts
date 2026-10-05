import {NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {Store} from '@ngrx/store';
import {BehaviorSubject, firstValueFrom, of} from 'rxjs';
import {LangService} from '@wm-core/localization/lang.service';
import {LayerFavoriteService} from '@wm-core/services/layer-favorite.service';
import {PassportService} from '@wm-core/passport/passport.service';
import {FAKE_BOX_PIPES} from '../box-template.spec-support';
import {PassportRoute} from '@wm-types/passport';
import {LayerBoxComponent} from './layer-box.component.camminiditalia';
import {describeLayerBoxFavoriteBehavior} from './layer-box-favorite.spec-support';

const noRoutes = {passportRoutes$: () => of(null)} as any;

describeLayerBoxFavoriteBehavior(
  'LayerBoxComponent (camminiditalia) — preferiti (oc:8176)',
  (langSvc, cdr, store, favoriteSvc, posthog) =>
    new LayerBoxComponent(langSvc, cdr, store, favoriteSvc, noRoutes, posthog),
);

describe('LayerBoxComponent (camminiditalia) — anello del passaporto (oc:8701)', () => {
  let routes$: BehaviorSubject<Map<number, PassportRoute> | null>;

  const route = (layerId: number, percent: number, completed = false): PassportRoute => ({
    layerId,
    validated: 1,
    total: 1,
    percent,
    completed,
  });

  function create(layerId: string): LayerBoxComponent {
    const store = {select: () => of(false)} as any;
    const langSvc = {onLangChange: of()} as any;
    const favoriteSvc = {isFavorite$: () => of(false)} as any;
    const passportSvc = {passportRoutes$: () => routes$} as any;
    const cmp = new LayerBoxComponent(langSvc, {markForCheck: () => {}} as any, store, favoriteSvc, passportSvc);
    cmp.data = {layer: {id: layerId, title: 'Cammino'}} as any;
    cmp.ngOnChanges();
    return cmp;
  }

  beforeEach(() => {
    routes$ = new BehaviorSubject<Map<number, PassportRoute> | null>(
      new Map([
        [40, route(40, 46)],
        [63, route(63, 100, true)],
      ]),
    );
  });

  it('cammino in corso: anello parziale', async () => {
    expect(await firstValueFrom(create('40').ring$)).toEqual({deg: 165.6, percent: 46, completed: false});
  });

  it('cammino completato: anello pieno', async () => {
    expect(await firstValueFrom(create('63').ring$)).toEqual({deg: 360, percent: 100, completed: true});
  });

  it('cammino non iniziato (assente da /api/passport): nessun anello', async () => {
    expect(await firstValueFrom(create('12').ring$)).toBeNull();
  });

  it('utente non loggato (nessun elenco): nessun anello', async () => {
    routes$.next(null);
    expect(await firstValueFrom(create('40').ring$)).toBeNull();
  });
});

describe('LayerBoxComponent (camminiditalia) — template dell\'anello (oc:8701)', () => {
  let routes$: BehaviorSubject<Map<number, PassportRoute> | null>;

  function render(layer: unknown): HTMLElement {
    const fixture = TestBed.createComponent(LayerBoxComponent);
    fixture.componentRef.setInput('data', {layer});
    fixture.componentInstance.ngOnChanges();
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    routes$ = new BehaviorSubject<Map<number, PassportRoute> | null>(
      new Map([
        [40, {layerId: 40, validated: 6, total: 13, percent: 46, completed: false}],
        [63, {layerId: 63, validated: 6, total: 6, percent: 100, completed: true}],
      ]),
    );
    TestBed.configureTestingModule({
      declarations: [LayerBoxComponent, ...FAKE_BOX_PIPES],
      providers: [
        {provide: Store, useValue: {select: () => of(false)}},
        {provide: LangService, useValue: {onLangChange: of()}},
        {provide: LayerFavoriteService, useValue: {isFavorite$: () => of(false)}},
        {provide: PassportService, useValue: {passportRoutes$: () => routes$}},
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  const logo = (el: HTMLElement) => el.querySelector('.wm-layer-box-logo-overlay') as HTMLElement;

  it('cammino in corso: anello con i gradi e aria-label con la percentuale', () => {
    const el = logo(render({id: '40', title: 'Cammino', logo_image: 'logo.png'}));

    expect(el.classList).toContain('wm-passport-logo-ring');
    expect(el.style.getPropertyValue('--wm-passport-ring-deg')).toBe('165.6deg');
    expect(el.getAttribute('aria-label')).toBe('46% completato');
  });

  it('cammino completato: aria-label «Cammino completato»', () => {
    const el = logo(render({id: '63', title: 'Cammino', logo_image: 'logo.png'}));

    expect(el.getAttribute('aria-label')).toBe('Cammino completato');
    expect(el.style.getPropertyValue('--wm-passport-ring-deg')).toBe('360deg');
  });

  it('cammino non iniziato: logo senza anello', () => {
    const el = logo(render({id: '12', title: 'Cammino', logo_image: 'logo.png'}));

    expect(el.classList).not.toContain('wm-passport-logo-ring');
    expect(el.getAttribute('aria-label')).toBeNull();
  });

  it('cammino senza logo: nessun anello, anche se iniziato', () => {
    const el = render({id: '40', title: 'Cammino'});

    expect(logo(el)).toBeNull();
    expect(el.querySelector('.wm-passport-logo-ring')).toBeNull();
  });
});
