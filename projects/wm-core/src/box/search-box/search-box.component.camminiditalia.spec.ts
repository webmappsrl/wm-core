import {NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {Store} from '@ngrx/store';
import {BehaviorSubject, firstValueFrom, of} from 'rxjs';
import {LangService} from '@wm-core/localization/lang.service';
import {PassportService} from '@wm-core/passport/passport.service';
import {FAKE_BOX_PIPES} from '../box-template.spec-support';
import {PassportStageIndex} from '@wm-types/passport';
import {ugcOpened} from '@wm-core/store/user-activity/user-activity.selector';
import {SearchBoxComponent} from './search-box.component.camminiditalia';

describe('SearchBoxComponent (camminiditalia) — chip del passaporto (oc:8701)', () => {
  const DATE = '2026-05-12T10:00:00+00:00';
  let ugc$: BehaviorSubject<boolean>;
  let index$: BehaviorSubject<PassportStageIndex | null>;

  let passportSvc: {stageIndex$: jasmine.Spy};

  function create(data: unknown, inCarousel = false): SearchBoxComponent {
    const store = {select: (sel: unknown) => (sel === ugcOpened ? ugc$ : of(null))} as any;
    const langSvc = {onLangChange: of(), currentLang: 'it'} as any;
    passportSvc = {stageIndex$: jasmine.createSpy('stageIndex$').and.returnValue(index$)};
    const el = {nativeElement: {closest: (sel: string) => (inCarousel && sel === 'wm-features-in-viewport' ? {} : null)}};
    const cmp = new SearchBoxComponent(
      langSvc,
      {markForCheck: () => {}} as any,
      store,
      passportSvc as any,
      el as any,
    );
    cmp.data = data as any;
    cmp.ngOnChanges();
    return cmp;
  }

  beforeEach(() => {
    ugc$ = new BehaviorSubject(false);
    index$ = new BehaviorSubject<PassportStageIndex | null>({
      completedAt: new Map([[203, DATE]]),
      pendingLayers: new Set(),
    });
  });

  it('tappa validata: chip completed con la data', async () => {
    const chip = await firstValueFrom(create({id: 203, layers: [40]}).chip$);

    expect(chip).toEqual({status: 'completed', completedAt: DATE});
  });

  it('tappa non validata: chip not_started', async () => {
    const chip = await firstValueFrom(create({id: 215, layers: [40]}).chip$);

    expect(chip).toEqual({status: 'not_started'});
  });

  it('«I miei percorsi» aperto: nessun chip, anche con l\'id di una tappa validata', async () => {
    ugc$.next(true);
    const chip = await firstValueFrom(create({id: 203, layers: []}).chip$);

    expect(chip).toBeNull();
  });

  it('indice non disponibile (utente non loggato): nessun chip', async () => {
    index$.next(null);
    const chip = await firstValueFrom(create({id: 203, layers: [40]}).chip$);

    expect(chip).toBeNull();
  });

  it('il cambio di data ricalcola il chip', async () => {
    const cmp = create({id: 215, layers: [40]});
    cmp.data = {id: 203, layers: [40]} as any;
    cmp.ngOnChanges();

    expect((await firstValueFrom(cmp.chip$))?.status).toBe('completed');
  });

  it('nel carosello della mappa: nessun chip e nessuna lettura del passaporto', async () => {
    const chip = await firstValueFrom(create({id: 203, layers: [40]}, true).chip$);

    expect(chip).toBeNull();
    expect(passportSvc.stageIndex$).not.toHaveBeenCalled();
  });

  it('chipDate formatta la data breve nella lingua corrente', () => {
    expect(create({id: 203}).chipDate(DATE)).toMatch(/12/);
  });
});

describe('SearchBoxComponent (camminiditalia) — template del chip (oc:8701)', () => {
  let index$: BehaviorSubject<PassportStageIndex | null>;

  function render(data: unknown): HTMLElement {
    const fixture = TestBed.createComponent(SearchBoxComponent);
    fixture.componentRef.setInput('data', data);
    fixture.componentInstance.ngOnChanges();
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    index$ = new BehaviorSubject<PassportStageIndex | null>({
      completedAt: new Map([[203, '2026-05-12T10:00:00+00:00']]),
      pendingLayers: new Set(),
    });
    TestBed.configureTestingModule({
      declarations: [SearchBoxComponent, ...FAKE_BOX_PIPES],
      providers: [
        {provide: Store, useValue: {select: () => of(false)}},
        {provide: LangService, useValue: {onLangChange: of(), currentLang: 'it'}},
        {provide: PassportService, useValue: {stageIndex$: () => index$}},
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  it('tappa validata: chip «percorsa» in una riga propria e card più alta', () => {
    const el = render({id: 203, layers: [40], name: 'Tappa 01', distance: '20.4'});
    const chip = el.querySelector('.wm-passport-stage-chip-row .wm-passport-stage-chip');

    expect(chip?.classList).toContain('wm-passport-stage-chip--done');
    expect(chip?.textContent).toContain('✓ percorsa il');
    expect(el.querySelector('ion-card')?.classList).toContain('wm-search-box-card--with-chip');
  });

  it('tappa non validata: chip «non ancora percorsa»', () => {
    const el = render({id: 215, layers: [40], name: 'Tappa 02'});

    expect(el.querySelector('.wm-passport-stage-chip')?.textContent).toContain('○ non ancora percorsa');
  });

  it('utente non loggato: nessun chip e altezza della card invariata', () => {
    index$.next(null);
    const el = render({id: 203, layers: [40], name: 'Tappa 01'});

    expect(el.querySelector('.wm-passport-stage-chip-row')).toBeNull();
    expect(el.querySelector('ion-card')?.classList).not.toContain('wm-search-box-card--with-chip');
  });
});
