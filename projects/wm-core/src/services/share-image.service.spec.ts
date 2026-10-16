import {Directory} from '@capacitor/filesystem';
import {FilesystemWeb} from '@capacitor/filesystem/dist/esm/web';
import {ShareWeb} from '@capacitor/share/dist/esm/web';
import {of, throwError} from 'rxjs';
import {
  WmPreparedShare,
  WmShareImageFetchError,
  WmShareImageService,
  WmShareTexts,
} from './share-image.service';

describe('WmShareImageService (oc:8702)', () => {
  const RESPONSE = {image_url: 'https://img/story.png', share_url: 'https://share/ugc-track/abc'};
  const TEXTS: WmShareTexts = {title: 'Titolo', dialogTitle: 'Dialogo', text: 'Testo'};

  let service: WmShareImageService;

  /**
   * Sostituisce una proprietà di `navigator` con un valore di test; `restoreNavigator()` la
   * rimuove e torna a valere quella del prototype `Navigator`.
   */
  const overridden: string[] = [];
  const setNavigator = (name: string, value: unknown): void => {
    Object.defineProperty(navigator, name, {configurable: true, writable: true, value});
    overridden.push(name);
  };
  const restoreNavigator = (): void => {
    while (overridden.length) {
      delete (navigator as any)[overridden.pop() as string];
    }
  };

  beforeEach(() => {
    service = new WmShareImageService();
  });

  afterEach(() => {
    restoreNavigator();
  });

  describe('shareNative', () => {
    let shareSpy: jasmine.Spy;
    let getUriSpy: jasmine.Spy;
    let downloadSpy: jasmine.Spy;

    beforeEach(() => {
      // `Share` e `Filesystem` sono Proxy di Capacitor: spyOn sul proxy non regge, si stubbano
      // le implementazioni web (in Karma la piattaforma è `web`).
      shareSpy = spyOn(ShareWeb.prototype, 'share').and.resolveTo({} as any);
      getUriSpy = spyOn(FilesystemWeb.prototype, 'getUri').and.resolveTo({
        uri: 'file:///cache/story.png',
      });
      // `downloadFile` è assegnata nel costruttore: l'accessor sul prototype intercetta
      // l'assegnazione e restituisce lo spy.
      downloadSpy = jasmine.createSpy('downloadFile').and.resolveTo({});
      Object.defineProperty(FilesystemWeb.prototype, 'downloadFile', {
        configurable: true,
        get: () => downloadSpy,
        set: () => {},
      });
    });

    afterEach(() => {
      delete (FilesystemWeb.prototype as any).downloadFile;
    });

    it('scarica image_url nella cache e condivide il file con share_url e i testi', async () => {
      await service.shareNative(of(RESPONSE), TEXTS, 'story.png');

      expect(downloadSpy).toHaveBeenCalledOnceWith(
        jasmine.objectContaining({
          url: RESPONSE.image_url,
          path: 'story.png',
          directory: Directory.Cache,
        }),
      );
      expect(getUriSpy).toHaveBeenCalledOnceWith({path: 'story.png', directory: Directory.Cache});
      expect(shareSpy).toHaveBeenCalledOnceWith({
        url: RESPONSE.share_url,
        files: ['file:///cache/story.png'],
        title: TEXTS.title,
        dialogTitle: TEXTS.dialogTitle,
        text: TEXTS.text,
      });
    });

    it('rilancia l’errore della richiesta senza scaricare né condividere', async () => {
      const error = new Error('richiesta fallita');

      await expectAsync(
        service.shareNative(throwError(() => error), TEXTS, 'story.png'),
      ).toBeRejectedWith(error);
      expect(downloadSpy).not.toHaveBeenCalled();
      expect(shareSpy).not.toHaveBeenCalled();
    });

    it('rilancia l’errore di Share.share', async () => {
      shareSpy.and.rejectWith(new Error('Share canceled'));

      await expectAsync(service.shareNative(of(RESPONSE), TEXTS, 'story.png')).toBeRejectedWithError(
        'Share canceled',
      );
    });
  });

  describe('prepareNative (anteprima, oc:8702)', () => {
    let getUriSpy: jasmine.Spy;
    let downloadSpy: jasmine.Spy;

    beforeEach(() => {
      getUriSpy = spyOn(FilesystemWeb.prototype, 'getUri').and.resolveTo({
        uri: 'file:///cache/tappa.png',
      });
      downloadSpy = jasmine.createSpy('downloadFile').and.resolveTo({});
      Object.defineProperty(FilesystemWeb.prototype, 'downloadFile', {
        configurable: true,
        get: () => downloadSpy,
        set: () => {},
      });
    });

    afterEach(() => {
      delete (FilesystemWeb.prototype as any).downloadFile;
    });

    it('scarica image_url nella cache e restituisce URI del file, image_url e share_url', async () => {
      const prepared = await service.prepareNative(RESPONSE, 'tappa.png');

      expect(downloadSpy).toHaveBeenCalledOnceWith(
        jasmine.objectContaining({
          url: RESPONSE.image_url,
          path: 'tappa.png',
          directory: Directory.Cache,
        }),
      );
      expect(getUriSpy).toHaveBeenCalledOnceWith({path: 'tappa.png', directory: Directory.Cache});
      expect(prepared).toEqual({
        fileUri: 'file:///cache/tappa.png',
        imageUrl: RESPONSE.image_url,
        shareUrl: RESPONSE.share_url,
      });
    });

    it('rilancia l’errore del download senza risolvere l’URI', async () => {
      downloadSpy.and.rejectWith(new Error('rete assente'));

      await expectAsync(service.prepareNative(RESPONSE, 'tappa.png')).toBeRejectedWithError(
        'rete assente',
      );
      expect(getUriSpy).not.toHaveBeenCalled();
    });
  });

  describe('shareNativePrepared (anteprima, oc:8702)', () => {
    const PREPARED = {
      fileUri: 'file:///cache/tappa.png',
      imageUrl: RESPONSE.image_url,
      shareUrl: RESPONSE.share_url,
    };
    let shareSpy: jasmine.Spy;

    beforeEach(() => {
      shareSpy = spyOn(ShareWeb.prototype, 'share').and.resolveTo({} as any);
    });

    it('condivide il file già in cache con share_url e i testi', async () => {
      await service.shareNativePrepared(PREPARED, TEXTS);

      expect(shareSpy).toHaveBeenCalledOnceWith({
        url: RESPONSE.share_url,
        files: ['file:///cache/tappa.png'],
        title: TEXTS.title,
        dialogTitle: TEXTS.dialogTitle,
        text: TEXTS.text,
      });
    });

    it('rilancia l’annullamento dell’utente', async () => {
      shareSpy.and.rejectWith(new Error('Share canceled'));

      await expectAsync(service.shareNativePrepared(PREPARED, TEXTS)).toBeRejectedWithError(
        'Share canceled',
      );
    });
  });

  describe('prepareWeb', () => {
    it('scarica image_url come File con il nome dato', async () => {
      const fetchSpy = spyOn(window, 'fetch').and.resolveTo(
        new Response(new Blob(['png'], {type: 'image/png'}), {status: 200}),
      );

      const prepared = await service.prepareWeb(RESPONSE, 'story.png');

      expect(fetchSpy).toHaveBeenCalledOnceWith(RESPONSE.image_url);
      expect(prepared.shareUrl).toBe(RESPONSE.share_url);
      expect(prepared.file instanceof File).toBeTrue();
      expect(prepared.file.name).toBe('story.png');
      expect(prepared.file.type).toBe('image/png');
    });

    it('se il fetch fallisce (es. CORS) lancia WmShareImageFetchError con image_url', async () => {
      spyOn(window, 'fetch').and.rejectWith(new TypeError('Failed to fetch'));

      await expectAsync(service.prepareWeb(RESPONSE, 'story.png')).toBeRejectedWith(
        jasmine.any(WmShareImageFetchError),
      );
      await expectAsync(service.prepareWeb(RESPONSE, 'story.png')).toBeRejectedWith(
        jasmine.objectContaining({imageUrl: RESPONSE.image_url, shareUrl: RESPONSE.share_url}),
      );
    });

    it('se la risposta non è ok lancia WmShareImageFetchError', async () => {
      spyOn(window, 'fetch').and.resolveTo(new Response('', {status: 404}));

      await expectAsync(service.prepareWeb(RESPONSE, 'story.png')).toBeRejectedWith(
        jasmine.any(WmShareImageFetchError),
      );
    });
  });

  describe('canShareFiles', () => {
    const prepared = (): WmPreparedShare => ({
      file: new File(['png'], 'story.png', {type: 'image/png'}),
      shareUrl: RESPONSE.share_url,
    });

    it('true se navigator.canShare({files}) lo consente', () => {
      const canShare = jasmine.createSpy('canShare').and.returnValue(true);
      setNavigator('canShare', canShare);
      setNavigator('share', () => Promise.resolve());
      const p = prepared();

      expect(service.canShareFiles(p)).toBeTrue();
      expect(canShare).toHaveBeenCalledOnceWith({files: [p.file]});
    });

    it('false con canShare false', () => {
      setNavigator('canShare', () => false);
      setNavigator('share', () => Promise.resolve());

      expect(service.canShareFiles(prepared())).toBeFalse();
    });

    it('false senza Web Share API', () => {
      setNavigator('canShare', undefined);
      setNavigator('share', undefined);

      expect(service.canShareFiles(prepared())).toBeFalse();
    });

    it('false se canShare lancia', () => {
      setNavigator('canShare', () => {
        throw new TypeError('no');
      });
      setNavigator('share', () => Promise.resolve());

      expect(service.canShareFiles(prepared())).toBeFalse();
    });
  });

  describe('shareWeb e downloadWeb', () => {
    let prepared: WmPreparedShare;
    let clicked: HTMLAnchorElement[];

    beforeEach(() => {
      prepared = {
        file: new File(['png'], 'story.png', {type: 'image/png'}),
        shareUrl: RESPONSE.share_url,
      };
      clicked = [];
      spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
        clicked.push(this);
      });
      spyOn(URL, 'createObjectURL').and.returnValue('blob:story');
      spyOn(URL, 'revokeObjectURL');
    });

    it('chiama navigator.share in modo sincrono, prima di qualunque await, e restituisce shared', async () => {
      const share = jasmine.createSpy('share').and.resolveTo();
      setNavigator('canShare', () => true);
      setNavigator('share', share);

      const pending = service.shareWeb(prepared, TEXTS);
      // il gesto dell'utente vale solo nel gestore del click: la chiamata deve essere già partita
      expect(share).toHaveBeenCalledOnceWith({
        files: [prepared.file],
        url: prepared.shareUrl,
        title: TEXTS.title,
        text: TEXTS.text,
      });

      expect(await pending).toBe('shared');
      expect(clicked.length).toBe(0);
    });

    it('con canShare false scarica il Blob e restituisce downloaded', async () => {
      const share = jasmine.createSpy('share');
      setNavigator('canShare', () => false);
      setNavigator('share', share);

      const res = await service.shareWeb(prepared, TEXTS);

      expect(share).not.toHaveBeenCalled();
      expect(clicked.length).toBe(1);
      expect(res).toBe('downloaded');
    });

    it('con AbortError (utente che annulla) rilancia l’errore senza scaricare', async () => {
      const abort = new DOMException('annullato', 'AbortError');
      setNavigator('canShare', () => true);
      setNavigator('share', jasmine.createSpy('share').and.rejectWith(abort));

      await expectAsync(service.shareWeb(prepared, TEXTS)).toBeRejectedWith(abort);
      expect(clicked.length).toBe(0);
    });

    it('con NotAllowedError o un altro errore scarica il Blob', async () => {
      setNavigator('canShare', () => true);
      const share = jasmine
        .createSpy('share')
        .and.returnValues(
          Promise.reject(new DOMException('no', 'NotAllowedError')),
          Promise.reject(new DOMException('no', 'DataError')),
        );
      setNavigator('share', share);

      expect(await service.shareWeb(prepared, TEXTS)).toBe('downloaded');
      expect(await service.shareWeb(prepared, TEXTS)).toBe('downloaded');
      expect(clicked.length).toBe(2);
    });

    it('downloadWeb scarica il Blob con <a download> e restituisce downloaded', () => {
      expect(service.downloadWeb(prepared)).toBe('downloaded');

      expect(URL.createObjectURL).toHaveBeenCalledOnceWith(prepared.file);
      expect(clicked.length).toBe(1);
      expect(clicked[0].download).toBe('story.png');
      expect(clicked[0].href).toBe('blob:story');
    });

    it('downloadWeb, se il Blob non si può scaricare apre share_url come ultima risorsa', () => {
      (URL.createObjectURL as jasmine.Spy).and.throwError('non supportato');
      const openSpy = spyOn(window, 'open').and.returnValue(null);

      expect(service.downloadWeb(prepared)).toBe('opened');
      expect(openSpy).toHaveBeenCalledOnceWith(prepared.shareUrl, '_blank', 'noopener');
    });

    it('shareWeb restituisce opened se il ripiego apre share_url', async () => {
      (URL.createObjectURL as jasmine.Spy).and.throwError('non supportato');
      spyOn(window, 'open').and.returnValue(null);
      setNavigator('canShare', () => false);
      setNavigator('share', jasmine.createSpy('share'));

      expect(await service.shareWeb(prepared, TEXTS)).toBe('opened');
    });
  });

  describe('isNative', () => {
    it('in Karma (piattaforma web) è false', () => {
      expect(service.isNative()).toBeFalse();
    });
  });
});
