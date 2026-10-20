import {HttpErrorResponse} from '@angular/common/http';
import {NO_ERRORS_SCHEMA} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {AlertController, ToastController} from '@ionic/angular';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {BehaviorSubject, Subject, of, throwError} from 'rxjs';
import {LangService} from '@wm-core/localization/lang.service';
import {UgcTrackStatsService} from '@wm-core/services/ugc-track-stats.service';
import {UrlHandlerService} from '@wm-core/services/url-handler.service';
import {ugcTracksFeatures} from '@wm-core/store/features/ugc/ugc.selector';
import {openUgc} from '@wm-core/store/user-activity/user-activity.action';
import {online} from '@wm-core/store/network/network.selector';
import {UGC_TRACK_STATS_DEFAULT_PARAMS} from '@wm-core/utils/ugc-track-stats';
import {FakeTransPipe, fakeLangService} from '@wm-core/passport/testing/fake-trans';
import {Experience, ExperiencesStatus} from '../experience.model';
import {ExperienceService} from '../experience.service';
import {WmExperienceDetailComponent, formatUgcDuration} from './experience-detail.component';

describe('WmExperienceDetailComponent (oc:8169)', () => {
  const experience: Experience = {
    id: 4,
    uuid: 'u4',
    layer: {id: 7, name: 'Cammino Minerario'},
    ecTrack: {id: 70, name: 'Tappa 05: Portixeddu - Piscinas'},
    description: 'Le dune',
    createdAt: '2026-06-12T10:00:00Z',
    updatedAt: '2026-06-12T10:00:00Z',
    photos: [
      {id: 1, url: 'u1', thumbnail: 't1'},
      {id: 2, url: 'u2', thumbnail: 't2'},
    ],
    ugcTrackIds: [],
  };

  let list$: BehaviorSubject<Experience[]>;
  let status$: BehaviorSubject<ExperiencesStatus>;
  let svc: {experiences$: () => any; status$: () => any; remove: jasmine.Spy};
  let toastCtrl: {create: jasmine.Spy};
  let alertRole: string;
  let host: {back: jasmine.Spy; edit: jasmine.Spy; exit?: jasmine.Spy};
  let urlHandler: {
    updateURL: jasmine.Spy;
    navigateTo: jasmine.Spy;
    getCurrentQueryParams: jasmine.Spy;
    getCurrentPath: jasmine.Spy;
  };
  /** Ordine delle chiamate, per verificare che il contenitore si chiuda prima di navigare. */
  let calls: string[];
  let fixture: ComponentFixture<WmExperienceDetailComponent>;
  let cmp: WmExperienceDetailComponent;

  beforeEach(() => {
    TestBed.resetTestingModule();
    list$ = new BehaviorSubject<Experience[]>([experience]);
    status$ = new BehaviorSubject<ExperiencesStatus>('active');
    svc = {
      experiences$: () => list$,
      status$: () => status$,
      remove: jasmine.createSpy('remove').and.returnValue(of(undefined)),
    };
    toastCtrl = {create: jasmine.createSpy('create').and.resolveTo({present: async () => {}})};
    alertRole = 'destructive';
    calls = [];
    host = {
      back: jasmine.createSpy('back'),
      edit: jasmine.createSpy('edit'),
      exit: jasmine.createSpy('exit').and.callFake(async () => {
        calls.push('exit');
        return true;
      }),
    };
    urlHandler = {
      updateURL: jasmine.createSpy('updateURL').and.callFake(() => void calls.push('updateURL')),
      navigateTo: jasmine.createSpy('navigateTo'),
      getCurrentQueryParams: jasmine.createSpy('getCurrentQueryParams').and.returnValue({}),
      getCurrentPath: jasmine.createSpy('getCurrentPath').and.returnValue('home'),
    };
    TestBed.configureTestingModule({
      declarations: [WmExperienceDetailComponent, FakeTransPipe],
      providers: [
        provideMockStore({
          selectors: [
            {selector: online, value: true},
            {
              selector: ugcTracksFeatures,
              value: [
                {
                  properties: {
                    id: 55,
                    name: 'Portixeddu → Piscinas',
                    createdAt: '2026-06-12T08:00:00Z',
                    stats: {distance: 16.4, duration: 312},
                  },
                },
                {properties: {id: 56, createdAt: '2026-06-13T08:00:00Z'}},
              ],
            },
          ],
        }),
        {provide: UrlHandlerService, useValue: urlHandler},
        {provide: UgcTrackStatsService, useValue: {params$: of(UGC_TRACK_STATS_DEFAULT_PARAMS)}},
        {provide: ExperienceService, useValue: svc},
        {provide: ToastController, useValue: toastCtrl},
        {provide: LangService, useValue: fakeLangService()},
        {
          provide: AlertController,
          useValue: {
            create: jasmine.createSpy('create').and.callFake(async () => ({
              present: async () => {},
              onDidDismiss: async () => ({role: alertRole}),
            })),
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
  });

  afterEach(() => {
    // gli override di MockStore restano sui selettori memoizzati, che sono globali
    TestBed.inject(MockStore).resetSelectors();
    TestBed.resetTestingModule();
  });

  /**
   * Crea il dettaglio con l'esperienza data.
   *
   * @param exp Esperienza.
   */
  function render(exp: Experience = experience): void {
    fixture = TestBed.createComponent(WmExperienceDetailComponent);
    cmp = fixture.componentInstance;
    cmp.experience = exp;
    cmp.host = host;
    fixture.detectChanges();
  }

  const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('mostra tappa, cammino, data, «visibile solo a te» e le foto', () => {
    render();
    expect(text()).toContain('Tappa 05: Portixeddu - Piscinas');
    expect(text()).toContain('Cammino Minerario');
    expect(text()).toContain('12 giugno 2026 · visibile solo a te');
    expect(fixture.nativeElement.querySelectorAll('.wm-experience-detail-photo').length).toBe(2);
    expect(fixture.nativeElement.querySelector('.wm-experience-detail-ugc')).toBeNull();
  });

  /** Righe delle registrazioni collegate. */
  const ugcRows = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('.wm-experience-detail-ugc-row'));

  it('una riga per ogni registrazione collegata, con nome, data, km e durata', () => {
    const linked = {...experience, ugcTrackIds: [55, 56]};
    list$.next([linked]);
    render(linked);
    expect(text()).toContain('Registrazioni collegate');
    expect(fixture.nativeElement.querySelector('.wm-experience-detail-ugc-count')?.textContent).toContain('2');
    const rows = ugcRows();
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Portixeddu → Piscinas');
    expect(rows[0].textContent).toContain("12 giugno 2026 · 16,4 km · 5 h 12'");
    // senza nome né dati tecnici: «Registrazione» e solo la data
    expect(rows[1].textContent).toContain('Registrazione');
    expect(rows[1].querySelector('.wm-experience-detail-ugc-sub')?.textContent?.trim()).toBe('13 giugno 2026');
    expect(rows.every(r => r.tagName === 'BUTTON')).toBeTrue();
  });

  it('una sola registrazione: niente conteggio', () => {
    const linked = {...experience, ugcTrackIds: [55]};
    list$.next([linked]);
    render(linked);
    expect(ugcRows().length).toBe(1);
    expect(fixture.nativeElement.querySelector('.wm-experience-detail-ugc-count')).toBeNull();
  });

  it('registrazione non presente sul telefono: «Registrazione», non toccabile', () => {
    const linked = {...experience, ugcTrackIds: [99]};
    list$.next([linked]);
    render(linked);
    const [row] = ugcRows();
    expect(row.tagName).toBe('DIV');
    expect(row.textContent).toContain('Registrazione');
    expect(row.querySelector('.wm-experience-detail-ugc-chevron')).toBeNull();
  });

  it('tap su una registrazione: chiude il contenitore, poi la apre sulla mappa come «I miei percorsi»', async () => {
    const linked = {...experience, ugcTrackIds: [55]};
    list$.next([linked]);
    render(linked);
    const store = TestBed.inject(MockStore);
    spyOn(store, 'dispatch');
    ugcRows()[0].click();
    await fixture.whenStable();
    expect(host.exit).toHaveBeenCalled();
    expect(store.dispatch).toHaveBeenCalledWith(openUgc());
    expect(urlHandler.updateURL).toHaveBeenCalledWith({ugc_track: 55}, ['map']);
    expect(calls).toEqual(['exit', 'updateURL']);
  });

  it('stesso ugc_track già nell\'URL, aperto dalla Home: naviga comunque alla mappa', async () => {
    urlHandler.getCurrentQueryParams.and.returnValue({ugc_track: '55', layer: '7'});
    urlHandler.getCurrentPath.and.returnValue('home');
    render();
    await cmp.openUgcTrack({id: 55, name: 'x', subline: '', openable: true});
    expect(urlHandler.updateURL).not.toHaveBeenCalled();
    expect(urlHandler.navigateTo).toHaveBeenCalledWith(['map'], {
      ugc_track: 55,
      layer: '7',
      track: undefined,
      poi: undefined,
      ugc_poi: undefined,
    });
  });

  it('stesso ugc_track già nell\'URL e già sulla mappa: passa da updateURL', async () => {
    urlHandler.getCurrentQueryParams.and.returnValue({ugc_track: '55'});
    urlHandler.getCurrentPath.and.returnValue('map');
    render();
    await cmp.openUgcTrack({id: 55, name: 'x', subline: '', openable: true});
    expect(urlHandler.navigateTo).not.toHaveBeenCalled();
    expect(urlHandler.updateURL).toHaveBeenCalledWith({ugc_track: 55}, ['map']);
  });

  it('il contenitore non si chiude (guard che rifiuta): non naviga e il dettaglio resta vivo', async () => {
    host.exit!.and.resolveTo(false);
    render();
    const store = TestBed.inject(MockStore);
    spyOn(store, 'dispatch');
    await cmp.openUgcTrack({id: 55, name: 'x', subline: '', openable: true});
    expect(store.dispatch).not.toHaveBeenCalled();
    expect(urlHandler.updateURL).not.toHaveBeenCalled();
    expect(urlHandler.navigateTo).not.toHaveBeenCalled();
    // il dettaglio non è uscito: una cancellazione riuscita dopo fa ancora il back
    await cmp.remove(experience);
    expect(host.back).toHaveBeenCalled();
  });

  it('host senza exit(): usa back() e apre la registrazione', async () => {
    delete host.exit;
    render();
    await cmp.openUgcTrack({id: 55, name: 'x', subline: '', openable: true});
    expect(host.back).toHaveBeenCalled();
    expect(urlHandler.updateURL).toHaveBeenCalledWith({ugc_track: 55}, ['map']);
  });

  it('registrazione non presente sul telefono: il tap non fa nulla', async () => {
    render({...experience, ugcTrackIds: [99]});
    await cmp.openUgcTrack({id: 99, name: 'Registrazione', subline: '', openable: false});
    expect(host.exit).not.toHaveBeenCalled();
    expect(urlHandler.updateURL).not.toHaveBeenCalled();
  });

  it('doppio tap su una registrazione: una sola apertura', async () => {
    render();
    const row = {id: 55, name: 'x', subline: '', openable: true};
    await Promise.all([cmp.openUgcTrack(row), cmp.openUgcTrack(row)]);
    expect(host.exit).toHaveBeenCalledTimes(1);
    expect(urlHandler.updateURL).toHaveBeenCalledTimes(1);
  });

  it('formatUgcDuration: ore e minuti, o solo minuti', () => {
    expect(formatUgcDuration(312)).toBe("5 h 12'");
    expect(formatUgcDuration(245)).toBe("4 h 05'");
    expect(formatUgcDuration(45)).toBe("45'");
  });

  it('segue lo stream: dopo una modifica mostra il testo salvato', () => {
    render();
    list$.next([{...experience, description: 'Testo nuovo'}]);
    fixture.detectChanges();
    expect(text()).toContain('Testo nuovo');
  });

  it('«Modifica» chiede al contenitore di aprire il form', () => {
    render();
    (fixture.nativeElement.querySelector('.wm-experience-detail-edit') as HTMLButtonElement).click();
    expect(host.edit).toHaveBeenCalledWith(experience);
  });

  it('«Elimina» confermato: cancella e chiude', async () => {
    render();
    await cmp.remove(experience);
    expect(svc.remove).toHaveBeenCalledWith(4);
    expect(host.back).toHaveBeenCalled();
  });

  it('back durante la DELETE: a cancellazione finita non rifà il pop', async () => {
    const pending = new Subject<void>();
    svc.remove.and.returnValue(pending);
    render();
    const done = cmp.remove(experience);
    await new Promise(resolve => setTimeout(resolve));
    expect(cmp.deleting).toBeTrue();
    fixture.destroy();
    pending.next();
    pending.complete();
    await done;
    expect(host.back).not.toHaveBeenCalled();
  });

  it('«Elimina» annullato: non cancella', async () => {
    alertRole = 'cancel';
    render();
    await cmp.remove(experience);
    expect(svc.remove).not.toHaveBeenCalled();
    expect(host.back).not.toHaveBeenCalled();
  });

  it('cancellazione non riuscita: resta aperto con il messaggio', async () => {
    svc.remove.and.returnValue(throwError(() => new Error('x')));
    render();
    await cmp.remove(experience);
    expect(host.back).not.toHaveBeenCalled();
    expect(cmp.errorMessage).toBe('Eliminazione non riuscita, riprova');
  });

  it('cancellazione senza connessione: messaggio dedicato', async () => {
    svc.remove.and.returnValue(throwError(() => new HttpErrorResponse({status: 0})));
    render();
    await cmp.remove(experience);
    expect(host.back).not.toHaveBeenCalled();
    expect(cmp.errorMessage).toBe('Nessuna connessione: riprova quando sei online.');
  });

  describe('offline', () => {
    /**
     * Imposta il segnale di rete dell'app.
     *
     * @param value `true` con la rete presente.
     */
    function setOnline(value: boolean): void {
      const store = TestBed.inject(MockStore);
      store.overrideSelector(online, value);
      store.refreshState();
    }

    it('senza rete «Modifica» avvisa che serve la connessione e non apre il form', async () => {
      setOnline(false);
      render();
      (fixture.nativeElement.querySelector('.wm-experience-detail-edit') as HTMLButtonElement).click();
      await fixture.whenStable();
      expect(host.edit).not.toHaveBeenCalled();
      expect(toastCtrl.create).toHaveBeenCalledWith(
        jasmine.objectContaining({message: 'Serve la connessione per questa azione.'}),
      );
    });

    it('senza rete «Elimina» avvisa senza chiedere conferma e non cancella', async () => {
      setOnline(false);
      render();
      await cmp.remove(experience);
      expect(TestBed.inject(AlertController).create).not.toHaveBeenCalled();
      expect(svc.remove).not.toHaveBeenCalled();
      expect(host.back).not.toHaveBeenCalled();
      expect(toastCtrl.create).toHaveBeenCalled();
    });

    it('stato offline/error del service ma rete presente: «Modifica» ed «Elimina» provano', async () => {
      status$.next('error');
      render();
      (fixture.nativeElement.querySelector('.wm-experience-detail-edit') as HTMLButtonElement).click();
      expect(host.edit).toHaveBeenCalledWith(experience);
      await cmp.remove(experience);
      expect(svc.remove).toHaveBeenCalledWith(4);
      expect(toastCtrl.create).not.toHaveBeenCalled();
    });

    it('tornata la rete «Modifica» apre di nuovo il form', () => {
      setOnline(false);
      render();
      setOnline(true);
      fixture.detectChanges();
      (fixture.nativeElement.querySelector('.wm-experience-detail-edit') as HTMLButtonElement).click();
      expect(host.edit).toHaveBeenCalledWith(experience);
    });

    it('foto che non si carica: si nasconde senza uscire dalla galleria', () => {
      render();
      const photos = fixture.nativeElement.querySelectorAll('.wm-experience-detail-photo');
      (photos[0] as HTMLImageElement).dispatchEvent(new Event('error'));
      expect((photos[0] as HTMLImageElement).style.visibility).toBe('hidden');
      expect(fixture.nativeElement.querySelectorAll('.wm-experience-detail-photo').length).toBe(2);
    });
  });
});
