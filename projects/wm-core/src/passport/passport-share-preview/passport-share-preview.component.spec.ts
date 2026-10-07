import {NO_ERRORS_SCHEMA} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {HttpErrorResponse} from '@angular/common/http';
import {of, Subject, throwError} from 'rxjs';
import {LangService} from '@wm-core/localization/lang.service';
import {PassportService} from '@wm-core/passport/passport.service';
import {
  WmPreparedNativeShare,
  WmPreparedShare,
  WmShareImageFetchError,
  WmShareImageResponse,
  WmShareImageService,
} from '@wm-core/services/share-image.service';
import {
  PassportSharePreviewHost,
  WmPassportSharePreviewComponent,
} from './passport-share-preview.component';
import {POSTHOG_CLIENT} from '@wm-core/store/conf/conf.token';
import {FakeTransPipe, fakeLangService} from '../testing/fake-trans';

describe('WmPassportSharePreviewComponent (oc:8702)', () => {
  const STAGE = {
    trackId: 203,
    name: {it: 'Tappa 06'},
    ref: '06',
    status: 'completed',
    shareable: true,
  } as any;
  const RESPONSE: WmShareImageResponse = {
    image_url: 'https://wmfe/tappa.png',
    share_url: 'https://share/passport-stage/abc',
  };
  const NATIVE: WmPreparedNativeShare = {
    fileUri: 'file:///cache/tappa-203.png',
    imageUrl: RESPONSE.image_url,
    shareUrl: RESPONSE.share_url,
  };
  const TITLE = 'Ho percorso una tappa di Cammino Grande di Celestino';

  let fixture: ComponentFixture<WmPassportSharePreviewComponent>;
  let cmp: WmPassportSharePreviewComponent;
  let passportSvc: jasmine.SpyObj<PassportService>;
  let shareSvc: jasmine.SpyObj<WmShareImageService>;
  let host: jasmine.SpyObj<PassportSharePreviewHost>;
  let webPrepared: WmPreparedShare;

  let posthog: {capture: jasmine.Spy};

  /** Il traduttore finto restituisce la chiave con i parametri sostituiti, come `wmtrans`. */
  const lang = fakeLangService();

  /**
   * Props attese di `contentShared` per la tappa di prova.
   *
   * @param method Il modo di condivisione atteso.
   * @returns Le props.
   */
  const sharedProps = (method: string) => ({
    content_type: 'passport-stage',
    content_id: '203',
    layer_id: '40',
    share_method: method,
  });

  beforeEach(() => {
    TestBed.resetTestingModule();
    passportSvc = jasmine.createSpyObj('PassportService', ['requestStageShareImage']);
    passportSvc.requestStageShareImage.and.returnValue(of(RESPONSE));
    shareSvc = jasmine.createSpyObj('WmShareImageService', [
      'isNative',
      'prepareNative',
      'shareNativePrepared',
      'prepareWeb',
      'canShareFiles',
      'shareWeb',
      'downloadWeb',
    ]);
    shareSvc.isNative.and.returnValue(true);
    shareSvc.prepareNative.and.resolveTo(NATIVE);
    shareSvc.shareNativePrepared.and.resolveTo();
    webPrepared = {
      file: new File(['png'], 'cammino-grande-di-celestino-tappa-06.png', {type: 'image/png'}),
      shareUrl: RESPONSE.share_url,
    };
    shareSvc.prepareWeb.and.resolveTo(webPrepared);
    shareSvc.canShareFiles.and.returnValue(true);
    shareSvc.shareWeb.and.resolveTo('shared');
    shareSvc.downloadWeb.and.returnValue('downloaded');
    posthog = {capture: jasmine.createSpy('capture')};
    host = jasmine.createSpyObj('PassportSharePreviewHost', ['back']);
    host.back.and.resolveTo();
    spyOn(URL, 'createObjectURL').and.returnValue('blob:tappa-203');
    spyOn(URL, 'revokeObjectURL');
    TestBed.configureTestingModule({
      declarations: [WmPassportSharePreviewComponent, FakeTransPipe],
      providers: [
        {provide: POSTHOG_CLIENT, useValue: posthog},
        {provide: LangService, useValue: lang},
        {provide: PassportService, useValue: passportSvc},
        {provide: WmShareImageService, useValue: shareSvc},
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  /**
   * Crea l'anteprima con la tappa e il layer di prova e la renderizza (parte `ngOnInit`).
   *
   * @returns Il componente.
   */
  function render(): WmPassportSharePreviewComponent {
    fixture = TestBed.createComponent(WmPassportSharePreviewComponent);
    cmp = fixture.componentInstance;
    cmp.stage = STAGE;
    cmp.layerId = 40;
    cmp.layerTitle = 'Cammino Grande di Celestino';
    cmp.host = host;
    fixture.detectChanges();
    return cmp;
  }

  /** Attende che le promise in corso si chiudano e aggiorna la vista. */
  async function settle(): Promise<void> {
    await fixture.whenStable();
    await new Promise(r => setTimeout(r));
    fixture.detectChanges();
  }

  const el = (): HTMLElement => fixture.nativeElement;
  const q = <T extends HTMLElement>(cls: string): T | null =>
    el().querySelector(`.wm-passport-share-preview-${cls}`) as T | null;
  const shareBtn = () => q<HTMLButtonElement>('share');
  const downloadBtn = () => q<HTMLButtonElement>('download');
  const openBtn = () => q<HTMLButtonElement>('open');
  const retryBtn = () => q<HTMLButtonElement>('retry');
  const retryCacheBtn = () => q<HTMLButtonElement>('retry-cache');
  const shareSpinner = () => q('share-spinner');
  const image = () => q<HTMLImageElement>('image');
  const errorText = (): string => (q('error')?.textContent ?? '').trim();

  it('header: titolo «Condividi la tappa» e la freccia torna indietro tramite la modale', async () => {
    render();
    await settle();

    expect(el().querySelector('ion-title')!.textContent).toContain('Condividi la tappa');
    (q('back') as HTMLElement).click();

    expect(host.back).toHaveBeenCalled();
  });

  it('loading: richiede l\'immagine della tappa e mostra spinner e messaggio, senza pulsanti', () => {
    const request = new Subject<WmShareImageResponse>();
    passportSvc.requestStageShareImage.and.returnValue(request);
    render();

    expect(passportSvc.requestStageShareImage).toHaveBeenCalledOnceWith(40, 203);
    expect(cmp.state).toBe('loading');
    expect(q('loading')!.querySelector('ion-spinner')).not.toBeNull();
    expect(q('loading')!.textContent).toContain("Sto preparando l'immagine…");
    expect(image()).toBeNull();
    expect(shareBtn()).toBeNull();
    expect(downloadBtn()).toBeNull();
  });

  it('l\'apertura dell\'anteprima non invia eventi a PostHog', async () => {
    render();
    await settle();

    expect(cmp.state).toBe('ready');
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  describe('nativo', () => {
    it('ready: immagine da image_url e solo «Condividi», attivo quando il file è in cache', async () => {
      let finish: (p: WmPreparedNativeShare) => void = () => {};
      shareSvc.prepareNative.and.returnValue(new Promise(r => (finish = r)));
      render();
      await settle();

      expect(cmp.state).toBe('ready');
      expect(shareSvc.prepareNative).toHaveBeenCalledOnceWith(RESPONSE, 'cammino-grande-di-celestino-tappa-06.png');
      expect(image()!.getAttribute('src')).toBe(RESPONSE.image_url);
      expect(shareBtn()).not.toBeNull();
      expect(shareBtn()!.disabled).toBeTrue();
      expect(downloadBtn()).toBeNull();
      expect(openBtn()).toBeNull();

      finish(NATIVE);
      await settle();

      expect(shareBtn()!.disabled).toBeFalse();
    });

    it('durante il download nella cache «Condividi» mostra lo spinner, che sparisce a file pronto', async () => {
      let finish: (p: WmPreparedNativeShare) => void = () => {};
      shareSvc.prepareNative.and.returnValue(new Promise(r => (finish = r)));
      render();
      await settle();

      expect(shareSpinner()).not.toBeNull();
      expect(shareBtn()!.querySelector('ion-icon')).toBeNull();
      expect(shareBtn()!.getAttribute('aria-busy')).toBe('true');

      finish(NATIVE);
      await settle();

      expect(shareSpinner()).toBeNull();
      expect(shareBtn()!.querySelector('ion-icon')).not.toBeNull();
      expect(shareBtn()!.getAttribute('aria-busy')).toBe('false');
    });

    it('«Condividi» apre il foglio di sistema con il file in cache e i testi', async () => {
      render();
      await settle();

      shareBtn()!.click();
      await settle();

      expect(shareSvc.shareNativePrepared).toHaveBeenCalledOnceWith(NATIVE, {
        title: TITLE,
        dialogTitle: 'Condividi con i tuoi amici',
      });
    });

    it('condivisione completata: contentShared una volta con share_method native-share', async () => {
      render();
      await settle();

      shareBtn()!.click();
      await settle();

      expect(posthog.capture).toHaveBeenCalledOnceWith('contentShared', sharedProps('native-share'));
    });

    it('annullamento dell\'utente: resta sull\'anteprima in silenzio', async () => {
      shareSvc.shareNativePrepared.and.rejectWith(new Error('Share canceled'));
      render();
      await settle();

      shareBtn()!.click();
      await settle();

      expect(cmp.state).toBe('ready');
      expect(errorText()).toBe('');
      expect(image()).not.toBeNull();
      expect(shareBtn()!.disabled).toBeFalse();
      expect(host.back).not.toHaveBeenCalled();
      expect(posthog.capture).not.toHaveBeenCalled();
    });

    it('errore del foglio diverso dall\'annullamento: messaggio generico e «Riprova»', async () => {
      shareSvc.shareNativePrepared.and.rejectWith(new Error('File non leggibile'));
      render();
      await settle();

      shareBtn()!.click();
      await settle();

      expect(cmp.state).toBe('error');
      expect(errorText()).toBe("Non è stato possibile creare l'immagine della tappa");
      expect(retryBtn()).not.toBeNull();
    });

    it('download in cache fallito: l\'immagine resta, sotto messaggio generico e «Riprova»', async () => {
      shareSvc.prepareNative.and.rejectWith(new Error('rete assente'));
      render();
      await settle();

      expect(cmp.state).toBe('ready');
      expect(image()!.getAttribute('src')).toBe(RESPONSE.image_url);
      expect(errorText()).toBe("Non è stato possibile creare l'immagine della tappa");
      expect(retryCacheBtn()).not.toBeNull();
      expect(retryBtn()).toBeNull();
      expect(shareBtn()).toBeNull();
      expect(shareSpinner()).toBeNull();
    });

    it('«Riprova» sotto l\'immagine ripete solo il download nella cache', async () => {
      let calls = 0;
      shareSvc.prepareNative.and.callFake(() =>
        ++calls === 1 ? Promise.reject(new Error('rete assente')) : Promise.resolve(NATIVE),
      );
      render();
      await settle();

      retryCacheBtn()!.click();
      fixture.detectChanges();

      expect(errorText()).toBe('');
      expect(shareSpinner()).not.toBeNull();
      await settle();

      expect(passportSvc.requestStageShareImage).toHaveBeenCalledTimes(1);
      expect(shareSvc.prepareNative).toHaveBeenCalledTimes(2);
      expect(shareSvc.prepareNative.calls.mostRecent().args[0]).toBe(RESPONSE);
      expect(cmp.state).toBe('ready');
      expect(image()!.getAttribute('src')).toBe(RESPONSE.image_url);
      expect(errorText()).toBe('');
      expect(shareBtn()!.disabled).toBeFalse();
      expect(shareSpinner()).toBeNull();
    });
  });

  describe('web', () => {
    beforeEach(() => shareSvc.isNative.and.returnValue(false));

    it('ready con canShareFiles true: immagine dal Blob, «Condividi» e «Scarica»', async () => {
      render();
      await settle();

      expect(shareSvc.prepareWeb).toHaveBeenCalledOnceWith(RESPONSE, 'cammino-grande-di-celestino-tappa-06.png');
      expect(cmp.state).toBe('ready');
      expect(image()!.getAttribute('src')).toBe('blob:tappa-203');
      expect(shareBtn()).not.toBeNull();
      expect(shareBtn()!.disabled).toBeFalse();
      expect(downloadBtn()).not.toBeNull();
      expect(openBtn()).toBeNull();
    });

    it('ready con canShareFiles false: solo «Scarica»', async () => {
      shareSvc.canShareFiles.and.returnValue(false);
      render();
      await settle();

      expect(shareBtn()).toBeNull();
      expect(downloadBtn()).not.toBeNull();
    });

    it('«Condividi» chiama navigator.share subito, nel gestore del click, con i testi', async () => {
      const real = new WmShareImageService();
      const share = jasmine.createSpy('share').and.resolveTo();
      const canShare = jasmine.createSpy('canShare').and.returnValue(true);
      Object.defineProperty(navigator, 'share', {configurable: true, writable: true, value: share});
      Object.defineProperty(navigator, 'canShare', {configurable: true, writable: true, value: canShare});
      shareSvc.shareWeb.and.callFake((p, t) => real.shareWeb(p, t));
      try {
        render();
        await settle();

        shareBtn()!.click();
        // nessun await prima di navigator.share: il gesto dell'utente è ancora valido
        expect(share).toHaveBeenCalledOnceWith({
          files: [webPrepared.file],
          url: RESPONSE.share_url,
          title: TITLE,
          text: undefined,
        });
        await settle();
      } finally {
        delete (navigator as any).share;
        delete (navigator as any).canShare;
      }
    });

    it('annullamento (AbortError): resta sull\'anteprima in silenzio, senza scaricare', async () => {
      shareSvc.shareWeb.and.rejectWith(new DOMException('annullato', 'AbortError'));
      render();
      await settle();

      shareBtn()!.click();
      await settle();

      expect(cmp.state).toBe('ready');
      expect(errorText()).toBe('');
      expect(shareSvc.downloadWeb).not.toHaveBeenCalled();
      expect(posthog.capture).not.toHaveBeenCalled();
    });

    it('condivisione web completata: contentShared una volta con share_method web-share', async () => {
      render();
      await settle();

      shareBtn()!.click();
      await settle();

      expect(posthog.capture).toHaveBeenCalledOnceWith('contentShared', sharedProps('web-share'));
    });

    it('«Condividi» che ripiega sul download: contentShared con share_method download', async () => {
      shareSvc.shareWeb.and.resolveTo('downloaded');
      render();
      await settle();

      shareBtn()!.click();
      await settle();

      expect(posthog.capture).toHaveBeenCalledOnceWith('contentShared', sharedProps('download'));
    });

    it('«Condividi» che ripiega aprendo share_url: contentShared con share_method open-image', async () => {
      shareSvc.shareWeb.and.resolveTo('opened');
      render();
      await settle();

      shareBtn()!.click();
      await settle();

      expect(posthog.capture).toHaveBeenCalledOnceWith('contentShared', sharedProps('open-image'));
    });

    it('«Scarica»: contentShared una volta con share_method download', async () => {
      render();
      await settle();

      downloadBtn()!.click();

      expect(posthog.capture).toHaveBeenCalledOnceWith('contentShared', sharedProps('download'));
    });

    it('«Scarica» che ripiega aprendo share_url: contentShared con share_method open-image', async () => {
      shareSvc.downloadWeb.and.returnValue('opened');
      render();
      await settle();

      downloadBtn()!.click();

      expect(posthog.capture).toHaveBeenCalledOnceWith('contentShared', sharedProps('open-image'));
    });

    it('un capture di PostHog rifiutato o che lancia non interrompe la condivisione', async () => {
      posthog.capture.and.callFake(() => Promise.reject(new Error('posthog giù')));
      render();
      await settle();

      expect(() => downloadBtn()!.click()).not.toThrow();
      posthog.capture.and.throwError('posthog giù');
      expect(() => downloadBtn()!.click()).not.toThrow();
      await settle();

      expect(shareSvc.downloadWeb).toHaveBeenCalledTimes(2);
    });

    it('«Scarica» scarica il Blob in memoria, senza rigenerare', async () => {
      render();
      await settle();

      downloadBtn()!.click();

      expect(shareSvc.downloadWeb).toHaveBeenCalledOnceWith(webPrepared);
      expect(passportSvc.requestStageShareImage).toHaveBeenCalledTimes(1);
    });

    it('Blob non scaricabile (CORS): immagine da image_url e solo «Apri immagine», che apre subito', async () => {
      shareSvc.prepareWeb.and.rejectWith(
        new WmShareImageFetchError(RESPONSE.image_url, RESPONSE.share_url),
      );
      const open = spyOn(window, 'open').and.returnValue(null);
      render();
      await settle();

      expect(cmp.state).toBe('ready');
      expect(image()!.getAttribute('src')).toBe(RESPONSE.image_url);
      expect(shareBtn()).toBeNull();
      expect(downloadBtn()).toBeNull();
      expect(openBtn()).not.toBeNull();
      expect(errorText()).toBe('');

      openBtn()!.click();
      // sincrono nel gestore del click: il popup non viene bloccato
      expect(open).toHaveBeenCalledOnceWith(RESPONSE.image_url, '_blank', 'noopener');
      expect(posthog.capture).toHaveBeenCalledOnceWith('contentShared', sharedProps('open-image'));
    });

    it('alla distruzione revoca l\'object URL dell\'immagine', async () => {
      render();
      await settle();

      fixture.destroy();

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:tappa-203');
    });
  });

  describe('errori della generazione', () => {
    it('403: «Questa tappa non risulta più percorsa» e «Riprova»', async () => {
      passportSvc.requestStageShareImage.and.returnValue(
        throwError(() => new HttpErrorResponse({status: 403})),
      );
      render();
      await settle();

      expect(cmp.state).toBe('error');
      expect(errorText()).toBe('Questa tappa non risulta più percorsa');
      expect(retryBtn()).not.toBeNull();
      expect(image()).toBeNull();
    });

    it('404: stesso messaggio del 403', async () => {
      passportSvc.requestStageShareImage.and.returnValue(
        throwError(() => new HttpErrorResponse({status: 404})),
      );
      render();
      await settle();

      expect(errorText()).toBe('Questa tappa non risulta più percorsa');
    });

    it('500: «Non è stato possibile creare l\'immagine della tappa»', async () => {
      passportSvc.requestStageShareImage.and.returnValue(
        throwError(() => new HttpErrorResponse({status: 500})),
      );
      render();
      await settle();

      expect(errorText()).toBe("Non è stato possibile creare l'immagine della tappa");
    });

    it('«Riprova» ripete la richiesta e, se riesce, mostra l\'immagine', async () => {
      passportSvc.requestStageShareImage.and.returnValues(
        throwError(() => new HttpErrorResponse({status: 500})),
        of(RESPONSE),
      );
      render();
      await settle();

      retryBtn()!.click();
      fixture.detectChanges();

      expect(cmp.state).toBe('loading');
      await settle();

      expect(passportSvc.requestStageShareImage).toHaveBeenCalledTimes(2);
      expect(cmp.state).toBe('ready');
      expect(errorText()).toBe('');
      expect(image()!.getAttribute('src')).toBe(RESPONSE.image_url);
    });
  });

  describe('cammino completato (oc:8703)', () => {
    /**
     * Crea l'anteprima del cammino (senza tappa) e la renderizza.
     *
     * @returns Il componente.
     */
    function renderRoute(): WmPassportSharePreviewComponent {
      fixture = TestBed.createComponent(WmPassportSharePreviewComponent);
      cmp = fixture.componentInstance;
      cmp.kind = 'route';
      cmp.layerId = 40;
      cmp.layerTitle = 'Cammino Grande di Celestino';
      cmp.host = host;
      fixture.detectChanges();
      return cmp;
    }

    beforeEach(() => {
      (passportSvc as any).requestLayerShareImage = jasmine.createSpy('requestLayerShareImage').and.returnValue(of(RESPONSE));
    });

    it('chiede l\'immagine del cammino, non quella di una tappa, con il titolo del traguardo', async () => {
      renderRoute();
      await settle();

      expect((passportSvc as any).requestLayerShareImage).toHaveBeenCalledOnceWith(40);
      expect(passportSvc.requestStageShareImage).not.toHaveBeenCalled();
      expect(el().querySelector('ion-title')!.textContent).toContain('Condividi il traguardo');
    });

    it('nome del file dal cammino', async () => {
      shareSvc.isNative.and.returnValue(true);
      renderRoute();
      await settle();

      expect(shareSvc.prepareNative).toHaveBeenCalledOnceWith(RESPONSE, 'cammino-grande-di-celestino.png');
    });

    it('403: il cammino non risulta più completato', async () => {
      (passportSvc as any).requestLayerShareImage.and.returnValue(throwError(() => new HttpErrorResponse({status: 403})));
      renderRoute();
      await settle();

      expect(errorText()).toBe('Questo cammino non risulta più completato');
    });

    it('altri errori: messaggio generico del cammino', async () => {
      (passportSvc as any).requestLayerShareImage.and.returnValue(throwError(() => new HttpErrorResponse({status: 500})));
      renderRoute();
      await settle();

      expect(errorText()).toBe("Non è stato possibile creare l'immagine del cammino");
    });

    it('la condivisione invia contentShared con content_type passport-route e i testi del traguardo', async () => {
      shareSvc.isNative.and.returnValue(true);
      renderRoute();
      await settle();
      shareBtn()!.click();
      await settle();

      expect(shareSvc.shareNativePrepared).toHaveBeenCalledOnceWith(NATIVE, {
        title: 'Ho completato Cammino Grande di Celestino',
        dialogTitle: 'Condividi con i tuoi amici',
      });
      expect(posthog.capture).toHaveBeenCalledOnceWith('contentShared', {
        content_type: 'passport-route',
        content_id: '40',
        layer_id: '40',
        share_method: 'native-share',
      });
    });
  });
});
