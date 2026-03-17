import {TestBed} from '@angular/core/testing';
import {HttpClient} from '@angular/common/http';
import {ModalController, ToastController, AlertController} from '@ionic/angular';

import {UpdateService} from './update.service';
import {APP_VERSION} from '@wm-core/store/conf/conf.token';
import {EnvironmentService} from './environment.service';
import {DeviceService} from './device.service';
import {LangService} from '../localization/lang.service';
import {APP} from '@wm-types/config';

describe('UpdateService', () => {
  let service: UpdateService;

  beforeEach(() => {
    // Pulisce l'eventuale stato precedente usato per il throttling
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
    } catch {}

    const modalCtrlSpy = jasmine.createSpyObj<ModalController>('ModalController', ['create']);
    const toastCtrlSpy = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    const alertCtrlSpy = jasmine.createSpyObj<AlertController>('AlertController', ['create']);

    const httpClientSpy = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);

    const envSvcStub: Partial<EnvironmentService> = {
      origin: 'https://example.com',
      appId: 123,
    } as any;

    const deviceSvcStub: Partial<DeviceService> = {
      get isAndroid() {
        return true;
      },
      get isIos() {
        return false;
      },
    } as any;

    const langSvcStub: Partial<LangService> = {
      instant: (key: string) => key,
    } as any;

    TestBed.configureTestingModule({
      providers: [
        UpdateService,
        {provide: ModalController, useValue: modalCtrlSpy},
        {provide: ToastController, useValue: toastCtrlSpy},
        {provide: AlertController, useValue: alertCtrlSpy},
        {provide: HttpClient, useValue: httpClientSpy},
        {provide: EnvironmentService, useValue: envSvcStub},
        {provide: DeviceService, useValue: deviceSvcStub},
        {provide: LangService, useValue: langSvcStub},
        {provide: APP_VERSION, useValue: '13.1.8'},
      ],
    });

    service = TestBed.inject(UpdateService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe('decodeVersionCode (privato)', () => {
    it('dovrebbe decodificare un versionCode nel formato MMNNPP0', () => {
      const decode = (service as any).decodeVersionCode.bind(service) as (c: number) => {
        major: number;
        minor: number;
        patch: number;
      } | null;

      expect(decode(1301080)).toEqual({major: 13, minor: 1, patch: 8});
      expect(decode(301100)).toEqual({major: 3, minor: 1, patch: 10});
      expect(decode(1212200)).toEqual({major: 12, minor: 12, patch: 20});
    });

    it('dovrebbe restituire null per valori non validi', () => {
      const decode = (service as any).decodeVersionCode.bind(service) as (c: number) => any;
      expect(decode(-1)).toBeNull();
      expect(decode(NaN as any)).toBeNull();
    });
  });

  describe('evaluateUpdate', () => {
    const baseConfig: APP = {
      minAppVersion: '13.1.8',
    } as any;

    it('dovrebbe classificare come major se current < minVersion', async () => {
      spyOn<any>(service, 'getCurrentAppVersion').and.returnValue(Promise.resolve('13.1.7'));
      spyOn<any>(service, 'getLastReleaseVersion').and.returnValue(Promise.resolve('13.1.9'));

      const result = await service.evaluateUpdate(baseConfig);

      expect(result.type).toBe('major');
      expect(result.minVersion).toBe('13.1.8');
      expect(result.currentVersion).toBe('13.1.7');
      expect(result.storeVersion).toBe('13.1.9');
    });

    it('dovrebbe classificare come patch se storeVersion è solo patch più alta', async () => {
      spyOn<any>(service, 'getCurrentAppVersion').and.returnValue(Promise.resolve('13.1.8'));
      spyOn<any>(service, 'getLastReleaseVersion').and.returnValue(Promise.resolve('13.1.9'));

      const result = await service.evaluateUpdate(baseConfig);

      expect(result.type).toBe('patch');
    });

    it('dovrebbe classificare come minor se storeVersion ha minor maggiore', async () => {
      spyOn<any>(service, 'getCurrentAppVersion').and.returnValue(Promise.resolve('13.1.8'));
      spyOn<any>(service, 'getLastReleaseVersion').and.returnValue(Promise.resolve('13.2.0'));

      const result = await service.evaluateUpdate(baseConfig);

      expect(result.type).toBe('minor');
    });

    it('dovrebbe restituire none se non ci sono differenze rilevanti', async () => {
      spyOn<any>(service, 'getCurrentAppVersion').and.returnValue(Promise.resolve('13.1.8'));
      spyOn<any>(service, 'getLastReleaseVersion').and.returnValue(Promise.resolve('13.1.8'));

      const result = await service.evaluateUpdate(baseConfig);

      expect(result.type).toBe('none');
    });
  });

  describe('handlePatchUpdate (throttling, privato)', () => {
    it('dovrebbe mostrare il toast la prima volta e non mostrarlo più entro l\'intervallo', async () => {
      const toastCtrl = TestBed.inject(ToastController) as jasmine.SpyObj<ToastController>;
      const presentSpy = jasmine.createSpy('present');

      toastCtrl.create.and.returnValue(
        Promise.resolve({
          present: presentSpy,
        } as any),
      );

      const evaluation = {
        type: 'patch',
        currentVersion: '13.1.8',
        minVersion: '13.1.8',
        storeVersion: '13.1.9',
      };

      const handlePatch = (service as any).handlePatchUpdate.bind(service) as (
        e: any,
        url: string | null,
      ) => Promise<void>;

      await handlePatch(evaluation, 'https://store.example.com/app');

      expect(toastCtrl.create).toHaveBeenCalledTimes(1);
      expect(presentSpy).toHaveBeenCalledTimes(1);

      // Seconda chiamata immediata: deve essere throttled e NON creare un nuovo toast
      await handlePatch(evaluation, 'https://store.example.com/app');

      expect(toastCtrl.create).toHaveBeenCalledTimes(1);
      expect(presentSpy).toHaveBeenCalledTimes(1);
    });
  });
});

