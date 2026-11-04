import {NO_ERRORS_SCHEMA, SimpleChange, SimpleChanges} from '@angular/core';
import {ComponentFixture, TestBed, fakeAsync, flushMicrotasks} from '@angular/core/testing';
import {AlertController, ModalController, Platform, ToastController} from '@ionic/angular';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {BehaviorSubject} from 'rxjs';
import {map} from 'rxjs/operators';
import {LangService} from '@wm-core/localization/lang.service';
import {isLogged} from '@wm-core/store/auth/auth.selectors';
import {online} from '@wm-core/store/network/network.selector';
import {openLoginModal} from '@wm-core/store/user-activity/user-activity.action';
import {FakeTransPipe, fakeLangService} from '@wm-core/passport/testing/fake-trans';
import {Diary, DiaryFilter, DiariesStatus} from '../diary.model';
import {DiaryService} from '../diary.service';
import {DiaryLauncherService} from '../diary-launcher.service';
import {WmDiariesSectionComponent} from './diaries-section.component';
import {DiaryOutboxItem, DiaryOutboxService} from '../diary-outbox.service';
import {DiaryDraftStore} from '../diary-draft.store';

describe('WmDiariesSectionComponent (oc:8169)', () => {
  const stageExp: Diary = {
    id: 1,
    uuid: 'u1',
    layer: {id: 7, name: 'Cammino Minerario'},
    ecTrack: {id: 70, name: 'Cammino Minerario - Tappa 05: Portixeddu - Piscinas'},
    description: 'Le dune di Piscinas',
    createdAt: '2026-06-12T10:00:00Z',
    updatedAt: '2026-06-12T10:00:00Z',
    photos: [{id: 3, url: 'u3', thumbnail: 't3'}],
    ugcTrackIds: [],
    publicationConsent: false,
  };
  const layerExp: Diary = {...stageExp, id: 2, uuid: 'u2', ecTrack: null, description: 'Trenta giorni'};

  let status$: BehaviorSubject<DiariesStatus>;
  let list$: BehaviorSubject<Diary[]>;
  let saved$: BehaviorSubject<boolean>;
  let refresh: jasmine.Spy;
  let toast: {present: jasmine.Spy};
  let toastCtrl: {create: jasmine.Spy};
  let store: MockStore;
  let modalCtrl: {create: jasmine.Spy};
  let fixture: ComponentFixture<WmDiariesSectionComponent>;
  let queued$: BehaviorSubject<DiaryOutboxItem[]>;
  let outbox: any;
  let drafts: any;
  let cmp: WmDiariesSectionComponent;

  beforeEach(() => {
    TestBed.resetTestingModule();
    status$ = new BehaviorSubject<DiariesStatus>('active');
    list$ = new BehaviorSubject<Diary[]>([]);
    saved$ = new BehaviorSubject<boolean>(false);
    refresh = jasmine.createSpy('refresh');
    toast = {present: jasmine.createSpy('present').and.resolveTo()};
    toastCtrl = {create: jasmine.createSpy('create').and.resolveTo(toast)};
    modalCtrl = {create: jasmine.createSpy('create')};
    const svc = {
      status$: () => status$.asObservable(),
      savedCopy$: () => saved$.asObservable(),
      refresh,
      diaries$: (f: DiaryFilter) =>
        list$.pipe(
          map(list =>
            list.filter(
              e =>
                (f.layerId == null || e.layer.id === f.layerId) &&
                (f.ecTrackId == null || e.ecTrack?.id === f.ecTrackId),
            ),
          ),
        ),
    };
    queued$ = new BehaviorSubject<DiaryOutboxItem[]>([]);
    outbox = {
      active: false,
      items$: () => queued$.asObservable(),
      discard: jasmine.createSpy('discard').and.resolveTo(),
    };
    drafts = {save: jasmine.createSpy('save').and.resolveTo(), load: jasmine.createSpy('load').and.resolveTo(null)};
    TestBed.configureTestingModule({
      declarations: [WmDiariesSectionComponent, FakeTransPipe],
      providers: [
        DiaryLauncherService,
        provideMockStore({
          selectors: [
            {selector: isLogged, value: false},
            {selector: online, value: true},
          ],
        }),
        {provide: DiaryService, useValue: svc},
        {provide: DiaryOutboxService, useValue: outbox},
        {provide: DiaryDraftStore, useValue: drafts},
        {provide: LangService, useValue: fakeLangService()},
        {provide: ModalController, useValue: modalCtrl},
        {provide: AlertController, useValue: {getTop: async () => undefined}},
        {provide: ToastController, useValue: toastCtrl},
        {provide: Platform, useValue: {backButton: {subscribeWithPriority: () => ({unsubscribe() {}})}}},
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
    store = TestBed.inject(MockStore);
    spyOn(store, 'dispatch');
  });

  afterEach(() => {
    // gli override di MockStore restano sui selettori memoizzati, che sono globali
    store.resetSelectors();
    TestBed.resetTestingModule();
  });

  /**
   * Crea il blocco con gli input dati e lo renderizza.
   *
   * @param inputs Input del componente.
   */
  function render(inputs: Partial<WmDiariesSectionComponent> = {}): void {
    fixture = TestBed.createComponent(WmDiariesSectionComponent);
    cmp = fixture.componentInstance;
    const values = {layerId: 7, title: 'Il mio diario', ...inputs};
    Object.assign(cmp, values);
    cmp.ngOnChanges(
      Object.keys(values).reduce<SimpleChanges>(
        (acc, key) => ({...acc, [key]: new SimpleChange(undefined, (values as Record<string, unknown>)[key], true)}),
        {},
      ),
    );
    fixture.detectChanges();
  }

  const el = (): HTMLElement => fixture.nativeElement;
  const section = (): HTMLElement | null => el().querySelector('.wm-diaries-section');
  const createButtons = (): HTMLButtonElement[] =>
    Array.from(el().querySelectorAll('.wm-diaries-section-create'));
  const labels = (): string[] =>
    Array.from(el().querySelectorAll('.wm-diaries-section-label')).map(l => (l.textContent ?? '').trim());

  const queuedItem = (status: 'pending' | 'failed'): DiaryOutboxItem => ({
    uuid: 'q-1', userId: 5, layerId: 3, description: 'scritto in rifugio', photos: [],
    publicationConsent: false, status, attempts: 0, nextAttemptAt: 0, updatedAt: 1,
    ratings: {route: 4, hospitality: 5, difficulty: null},
    ...(status === 'failed' ? {errorMessage: 'Il diario non è stato inviato: aprilo per correggerlo.'} : {}),
  });

  it('con la coda attiva il tocco su «Racconta…» apre il form anche senza rete', () => {
    outbox.active = true;
    store.overrideSelector(online, false);
    render({layerId: 3});
    const launcher = TestBed.inject(DiaryLauncherService);
    spyOn(launcher, 'openForm').and.resolveTo();
    cmp.create();
    expect(launcher.openForm).toHaveBeenCalled();
  });

  it('senza pulsante (lontano dal cammino) i diari già scritti restano visibili', () => {
    store.overrideSelector(isLogged, true);
    list$.next([layerExp]);
    render({layerId: 7, layout: 'list', showCreate: false});
    expect(fixture.nativeElement.querySelectorAll('.wm-diaries-section-item').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.wm-diaries-section-create')).toBeNull();
  });

  it('l\'estratto della scheda è testo semplice (oc:8169, ciclo 3)', () => {
    store.overrideSelector(isLogged, true);
    list$.next([{...layerExp, description: '<h2>Giorno 1</h2><p>A &amp; <strong>B</strong></p>'}]);
    render({layerId: 7, layout: 'list', showCreate: false});
    const excerpt = fixture.nativeElement.querySelector('.wm-diaries-section-excerpt') as HTMLElement;
    expect(excerpt.textContent?.trim()).toBe('Giorno 1 A & B');
    expect(excerpt.querySelector('strong')).toBeNull();
  });

  it('nella registrazione non si mostrano i diari in coda', () => {
    queued$.next([queuedItem('pending')]);
    store.overrideSelector(isLogged, true);
    list$.next([layerExp]);
    render({ugcTrackId: 55, layout: 'list'});
    expect(fixture.nativeElement.querySelector('.wm-diaries-section-queued')).toBeNull();
  });

  it('riaprendo un non inviato con una bozza diversa già nello stesso contesto non la sovrascrive', async () => {
    drafts.load = jasmine.createSpy('load').and.resolveTo({uuid: 'altra-bozza'});
    render({layerId: 3});
    const launcher = TestBed.inject(DiaryLauncherService);
    spyOn(launcher, 'openForm').and.resolveTo();
    await cmp.openQueued(queuedItem('failed'));
    expect(drafts.save).not.toHaveBeenCalled();
    expect(outbox.discard).not.toHaveBeenCalled();
    expect(launcher.openForm).not.toHaveBeenCalled();
    expect(toastCtrl.create).toHaveBeenCalled();
  });

  it('un diario in coda mostra «In attesa di invio» come stato', () => {
    queued$.next([queuedItem('pending')]);
    render({layerId: 3});
    const state = fixture.nativeElement.querySelector('.wm-diaries-section-queued-state');
    expect(state.getAttribute('role')).toBe('status');
    expect(state.textContent).toContain('In attesa di invio');
  });

  it('un diario non inviato si riapre nel form come bozza con il messaggio', async () => {
    queued$.next([queuedItem('failed')]);
    render({layerId: 3});
    const launcher = TestBed.inject(DiaryLauncherService);
    spyOn(launcher, 'openForm').and.resolveTo();
    const btn = fixture.nativeElement.querySelector('.wm-diaries-section-queued');
    expect(btn.textContent).toContain('Non inviato');
    await cmp.openQueued(queuedItem('failed'));
    expect(drafts.save).toHaveBeenCalled();
    const saved = drafts.save.calls.mostRecent().args[0];
    expect(saved.uuid).toBe('q-1');
    expect(saved.errorMessage).toBeTruthy();
    expect(saved.ratings).toEqual({route: 4, hospitality: 5, difficulty: null});
    expect(outbox.discard).toHaveBeenCalledWith('q-1');
    expect(launcher.openForm).toHaveBeenCalled();
  });

  it('status off non rende nulla', () => {
    status$.next('off');
    list$.next([stageExp]);
    render();
    expect(section()).toBeNull();
  });

  it('in caricamento non rende nulla', () => {
    status$.next('loading');
    render();
    expect(section()).toBeNull();
  });

  it('login-required mostra solo la scheda Racconta', () => {
    status$.next('login-required');
    render();
    expect(section()).not.toBeNull();
    expect(createButtons().length).toBe(1);
    expect(createButtons()[0].textContent).toContain('Racconta il tuo cammino');
    expect(el().querySelectorAll('.wm-diaries-section-card').length).toBe(0);
    expect(el().querySelector('.wm-diaries-section-count')).toBeNull();
  });

  it('tocco da non loggato dispatcha openLoginModal', fakeAsync(() => {
    status$.next('login-required');
    render();
    createButtons()[0].click();
    flushMicrotasks();
    expect(store.dispatch).toHaveBeenCalledWith(openLoginModal());
    expect(modalCtrl.create).not.toHaveBeenCalled();
  }));

  it('carousel del cammino mostra TAPPA o CAMMINO', () => {
    list$.next([stageExp, layerExp]);
    render({layout: 'carousel'});
    expect(labels()).toEqual(['TAPPA 05', 'CAMMINO']);
    expect(el().querySelectorAll('.wm-diaries-section-card').length).toBe(2);
    // la scheda «Racconta…» è la prima slide del carosello, prima delle esperienze
    const firstSlide = el().querySelector('.wm-diaries-section-row swiper-slide') as HTMLElement;
    expect(firstSlide.firstElementChild?.classList).toContain('wm-diaries-section-create--card');
    expect(el().querySelector('.wm-diaries-section-count')?.textContent?.trim()).toBe('2');
  });

  it('nelle registrazioni l\'esperienza sul cammino mostra il nome del cammino', () => {
    list$.next([stageExp, layerExp]);
    render({layout: 'list', ugcTrackId: 5, showCreate: false});
    expect(labels()).toEqual(['TAPPA 05', 'CAMMINO MINERARIO']);
    expect(createButtons().length).toBe(0);
  });

  it('sulla tappa l\'elenco mostra data e foto e «Racconta questa tappa»', () => {
    list$.next([stageExp, layerExp]);
    render({layout: 'list', ecTrackId: 70});
    expect(labels().length).toBe(1);
    expect(labels()[0]).toContain('· 1 foto');
    expect(createButtons()[0].textContent).toContain('Racconta questa tappa');
  });

  it('sulla tappa mostra anche l\'esperienza che il backend ha legato a un altro cammino', () => {
    const otherLayer: Diary = {...stageExp, id: 3, uuid: 'u3', layer: {id: 99, name: 'Altro cammino'}};
    list$.next([otherLayer, layerExp]);
    render({layout: 'list', layerId: 7, ecTrackId: 70});
    expect(el().querySelectorAll('.wm-diaries-section-item').length).toBe(1);
  });

  it('hideWhenEmpty nasconde a zero', () => {
    render({hideWhenEmpty: true});
    expect(section()).toBeNull();
    list$.next([layerExp]);
    fixture.detectChanges();
    expect(section()).not.toBeNull();
  });

  it('senza scheda di creazione e senza esperienze non rende nulla', () => {
    render({showCreate: false});
    expect(section()).toBeNull();
  });

  it('il tocco su una scheda apre il dettaglio con il nav del contenitore', () => {
    list$.next([layerExp]);
    const nav = {} as any;
    render({nav});
    const launcher = TestBed.inject(DiaryLauncherService);
    spyOn(launcher, 'openDetail').and.resolveTo();
    (el().querySelector('.wm-diaries-section-card') as HTMLButtonElement).click();
    expect(launcher.openDetail).toHaveBeenCalledWith(layerExp, nav, undefined);
  });

  it('carousel: l\'esperienza di solo testo non rende la foto e ha il modificatore text', () => {
    const textExp: Diary = {...layerExp, id: 4, uuid: 'u4', photos: []};
    list$.next([textExp]);
    render({layout: 'carousel'});
    const card = el().querySelector('.wm-diaries-section-card') as HTMLElement;
    expect(card.querySelector('.wm-diaries-section-card-photo')).toBeNull();
    expect(card.classList).toContain('wm-diaries-section-card--text');
  });
  it('carousel: con foto la scheda ha il riquadro foto e nessun modificatore text', () => {
    list$.next([layerExp]);
    render({layout: 'carousel'});
    const card = el().querySelector('.wm-diaries-section-card') as HTMLElement;
    expect(card.querySelector('.wm-diaries-section-card-photo')).not.toBeNull();
    expect(card.classList).not.toContain('wm-diaries-section-card--text');
  });
  it('elenco: senza foto niente miniatura, con foto la miniatura c\'e\'', () => {
    const textExp: Diary = {...layerExp, id: 4, uuid: 'u4', photos: []};
    list$.next([textExp, layerExp]);
    render({layout: 'list'});
    const items = el().querySelectorAll('.wm-diaries-section-item');
    expect(items[0].querySelector('.wm-diaries-section-item-photo')).toBeNull();
    expect(items[1].querySelector('.wm-diaries-section-item-photo')).not.toBeNull();
  });

  describe('offline', () => {
    const notice = (): HTMLElement | null => el().querySelector('.wm-diaries-section-offline');
    const retryButton = (): HTMLButtonElement | null => el().querySelector('.wm-diaries-section-retry');

    /**
     * Imposta il segnale di rete dell'app.
     *
     * @param value `true` con la rete presente.
     */
    function setOnline(value: boolean): void {
      store.overrideSelector(online, value);
      store.refreshState();
    }

    it('con la copia salvata mostra la lista, la riga d\'avviso e «Riprova»', () => {
      status$.next('offline');
      saved$.next(true);
      list$.next([layerExp]);
      render({layout: 'carousel'});
      expect(notice()?.textContent).toContain("Sei offline: stai vedendo l'ultima versione salvata.");
      expect(el().querySelectorAll('.wm-diaries-section-card').length).toBe(1);
      expect(createButtons().length).toBe(1);
      retryButton()?.click();
      expect(refresh).toHaveBeenCalled();
    });

    it('senza rete il tocco su «Racconta…» avvisa e non apre il form', fakeAsync(() => {
      setOnline(false);
      status$.next('offline');
      saved$.next(true);
      render();
      const launcher = TestBed.inject(DiaryLauncherService);
      spyOn(launcher, 'openForm').and.resolveTo();
      createButtons()[0].click();
      flushMicrotasks();
      expect(launcher.openForm).not.toHaveBeenCalled();
      expect(toastCtrl.create).toHaveBeenCalledWith(
        jasmine.objectContaining({message: 'Serve la connessione per questa azione.'}),
      );
      expect(toast.present).toHaveBeenCalled();
    }));

    it('lettura fallita con la rete presente: riga dedicata e «Racconta…» apre il form', fakeAsync(() => {
      status$.next('error');
      saved$.next(true);
      list$.next([layerExp]);
      render();
      expect(notice()?.textContent).toContain('Non è stato possibile aggiornare il diario.');
      expect(retryButton()).not.toBeNull();
      const launcher = TestBed.inject(DiaryLauncherService);
      spyOn(launcher, 'openForm').and.resolveTo();
      (el().querySelector('.wm-diaries-section-create') as HTMLButtonElement).click();
      flushMicrotasks();
      expect(launcher.openForm).toHaveBeenCalled();
      expect(toastCtrl.create).not.toHaveBeenCalled();
    }));

    it('lettura fallita senza copia: riga e «Riprova», niente lista né scheda', () => {
      status$.next('error');
      saved$.next(false);
      render();
      expect(notice()?.textContent).toContain('Non è stato possibile aggiornare il diario.');
      expect(createButtons().length).toBe(0);
    });

    it('senza copia da loggato: «Le tue esperienze…», «Riprova», niente scheda di creazione', () => {
      store.overrideSelector(isLogged, true);
      store.refreshState();
      status$.next('offline');
      saved$.next(false);
      render();
      expect(section()).not.toBeNull();
      expect(notice()?.textContent).toContain('Il tuo diario non è disponibile senza connessione.');
      expect(createButtons().length).toBe(0);
      expect(retryButton()?.textContent).toContain('Riprova');
      retryButton()?.click();
      expect(refresh).toHaveBeenCalled();
    });

    it('senza copia da non loggato: testo generico', () => {
      status$.next('offline');
      saved$.next(false);
      render();
      expect(notice()?.textContent).toContain('Il diario non è disponibile senza connessione.');
    });

    it('senza copia salvata e hideWhenEmpty non rende nulla', () => {
      status$.next('offline');
      saved$.next(false);
      render({hideWhenEmpty: true, showCreate: false});
      expect(section()).toBeNull();
    });

    it('online la riga d\'avviso non c\'è', () => {
      list$.next([layerExp]);
      render();
      expect(notice()).toBeNull();
      expect(retryButton()).toBeNull();
    });

    it('foto che non si carica: si nasconde e resta il riquadro neutro', () => {
      list$.next([layerExp]);
      render({layout: 'carousel'});
      const img = el().querySelector('.wm-diaries-section-card-photo img') as HTMLImageElement;
      img.dispatchEvent(new Event('error'));
      expect(img.style.visibility).toBe('hidden');
      expect(el().querySelector('.wm-diaries-section-card-photo')).not.toBeNull();
    });
  });
});
