import {AlertController} from '@ionic/angular';
import {Store} from '@ngrx/store';
import {LineString} from 'geojson';
import {of} from 'rxjs';

import {LangService} from '@wm-core/localization/lang.service';
import {UrlHandlerService} from '@wm-core/services/url-handler.service';
import {WmFeature} from '@wm-types/feature';
import {EUgcTrackShareState} from '@wm-core/types/eugc-track-share-state.enum';

import {UgcTrackPropertiesComponent} from './ugc-track-properties.component';

/**
 * These tests exercise `UgcTrackPropertiesComponent` as a plain TS class (no `TestBed`,
 * no template compilation): the component's template uses `wmtrans`/`LangService`, whose
 * DI chain (`APP_TRANSLATION`) is not wired up outside the full app module and has
 * previously caused `NG0201` crashes in boilerplate specs (see wm-core CLAUDE.md, oc:8023).
 * Instantiating the class directly with mocked constructor dependencies avoids Angular's
 * compiler/DI entirely while still covering the share state machine and conf gating,
 * neither of which depends on `OlMap` or any native/browser API.
 */
describe('UgcTrackPropertiesComponent — condivisione social (oc:8183)', () => {
  const fakeTrack: WmFeature<LineString> = {
    type: 'Feature',
    properties: {id: 1, name: 'Traccia di prova'},
    geometry: {
      type: 'LineString',
      coordinates: [
        [0, 0],
        [1, 1],
      ],
    },
  } as any;

  let storeSpy: jasmine.SpyObj<Store>;
  let alertCtrlSpy: jasmine.SpyObj<AlertController>;
  let langSvcSpy: jasmine.SpyObj<LangService>;
  let urlHandlerSvcSpy: jasmine.SpyObj<UrlHandlerService>;
  let component: UgcTrackPropertiesComponent;

  /**
   * Builds a fresh component instance, optionally with a specific `OPTIONS` conf value
   * for the `confOPTIONS$` observable (read once at construction time, like the real
   * `Store.select`).
   */
  function createComponent(confOptions: any = {}): UgcTrackPropertiesComponent {
    storeSpy = jasmine.createSpyObj<Store>('Store', ['select', 'dispatch']);
    storeSpy.select.and.returnValue(of(confOptions));
    alertCtrlSpy = jasmine.createSpyObj('AlertController', ['create']);
    alertCtrlSpy.create.and.resolveTo({present: jasmine.createSpy('present')} as any);
    langSvcSpy = jasmine.createSpyObj('LangService', ['instant']);
    langSvcSpy.instant.and.callFake((key: string) => key);
    urlHandlerSvcSpy = jasmine.createSpyObj('UrlHandlerService', ['updateURL']);

    const instance = new UgcTrackPropertiesComponent(
      storeSpy,
      alertCtrlSpy,
      langSvcSpy,
      urlHandlerSvcSpy,
    );
    instance.track = fakeTrack;
    return instance;
  }

  beforeEach(() => {
    component = createComponent();
  });

  describe('state machine UI', () => {
    it('parte in stato idle', () => {
      expect(component.shareState$.value).toBe(EUgcTrackShareState.IDLE);
      expect(component.shareErrorMessage).toBeNull();
    });

    it('triggerShare emette share-track con la traccia corrente e passa a generating', () => {
      spyOn(component.shareTrack, 'emit');

      component.triggerShare();

      expect(component.shareState$.value).toBe(EUgcTrackShareState.GENERATING);
      expect(component.shareTrack.emit).toHaveBeenCalledOnceWith(fakeTrack);
    });

    it('non riemette shareTrack se richiamato mentre è già in generating (guardia doppio tap)', () => {
      spyOn(component.shareTrack, 'emit');

      component.triggerShare();
      component.triggerShare();
      component.triggerShare();

      expect(component.shareTrack.emit).toHaveBeenCalledTimes(1);
      expect(component.shareState$.value).toBe(EUgcTrackShareState.GENERATING);
    });

    it('un risultato positivo sposta lo stato a success e azzera il messaggio di errore', () => {
      component.triggerShare();

      component.setShareResult = {success: true};

      expect(component.shareState$.value).toBe(EUgcTrackShareState.SUCCESS);
      expect(component.shareErrorMessage).toBeNull();
    });

    it('un risultato negativo sposta lo stato a error e conserva il messaggio ricevuto', () => {
      component.triggerShare();

      component.setShareResult = {success: false, errorMessage: 'Nessuna connessione'};

      expect(component.shareState$.value).toBe(EUgcTrackShareState.ERROR);
      expect(component.shareErrorMessage).toBe('Nessuna connessione');
    });

    it('un risultato negativo senza errorMessage lascia il messaggio nullo (fallback in UI)', () => {
      component.triggerShare();

      component.setShareResult = {success: false};

      expect(component.shareState$.value).toBe(EUgcTrackShareState.ERROR);
      expect(component.shareErrorMessage).toBeNull();
    });

    it('setShareResult(null) è un no-op: non altera lo stato corrente', () => {
      component.triggerShare();

      component.setShareResult = null;

      expect(component.shareState$.value).toBe(EUgcTrackShareState.GENERATING);
    });

    it('un risultato negativo apre un alert nativo invece di un banner in-template', () => {
      component.triggerShare();

      component.setShareResult = {success: false, errorMessage: 'Nessuna connessione'};

      expect(alertCtrlSpy.create).toHaveBeenCalledOnceWith(
        jasmine.objectContaining({
          message: 'Nessuna connessione',
          buttons: jasmine.arrayContaining([
            jasmine.objectContaining({text: 'Annulla', role: 'cancel'}),
            jasmine.objectContaining({text: 'Riprova'}),
          ]),
        }),
      );
    });

    it('il bottone "Riprova" dell\'alert riemette lo stesso evento e torna a generating', () => {
      spyOn(component.shareTrack, 'emit');
      component.triggerShare();

      component.setShareResult = {success: false, errorMessage: 'boom'};

      const retryButton = (alertCtrlSpy.create.calls.mostRecent().args[0] as any).buttons.find(
        (button: any) => button.text === 'Riprova',
      );
      retryButton.handler();

      expect(component.shareState$.value).toBe(EUgcTrackShareState.GENERATING);
      expect(component.shareTrack.emit).toHaveBeenCalledTimes(2);
    });

    it('il retry dopo un errore riemette lo stesso evento e torna a generating', () => {
      spyOn(component.shareTrack, 'emit');
      component.triggerShare();
      component.setShareResult = {success: false, errorMessage: 'boom'};

      component.triggerShare();

      expect(component.shareState$.value).toBe(EUgcTrackShareState.GENERATING);
      expect(component.shareErrorMessage).toBeNull();
      expect(component.shareTrack.emit).toHaveBeenCalledTimes(2);
      expect(component.shareTrack.emit).toHaveBeenCalledWith(fakeTrack);
    });
  });

  describe('gating sul flag conf ugcTrackShareEnabled', () => {
    it('confOPTIONS$ espone ugcTrackShareEnabled=true quando il conf lo abilita', done => {
      const instance = createComponent({ugcTrackShareEnabled: true});

      instance.confOPTIONS$.subscribe(options => {
        expect(options.ugcTrackShareEnabled).toBe(true);
        done();
      });
    });

    it('confOPTIONS$ espone ugcTrackShareEnabled=false quando il conf lo disabilita esplicitamente', done => {
      const instance = createComponent({ugcTrackShareEnabled: false});

      instance.confOPTIONS$.subscribe(options => {
        expect(options.ugcTrackShareEnabled).toBe(false);
        done();
      });
    });

    it('confOPTIONS$ non definisce ugcTrackShareEnabled quando assente dal conf (default gated a false in UI)', done => {
      const instance = createComponent({});

      instance.confOPTIONS$.subscribe(options => {
        expect(options.ugcTrackShareEnabled).toBeUndefined();
        done();
      });
    });
  });
});
