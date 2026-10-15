import {TestBed} from '@angular/core/testing';
import {provideMockStore} from '@ngrx/store/testing';
import {of} from 'rxjs';
import {GeolocationService} from './geolocation.service';
import {DeviceService} from './device.service';
import {UgcTrackStatsService} from './ugc-track-stats.service';
import {UGC_TRACK_STATS_DEFAULT_PARAMS} from '@wm-core/utils/ugc-track-stats';
import {GpsStatus} from '@wm-core/utils/gps-status';

/**
 * Configura il TestBed e crea il servizio con il dispositivo indicato.
 * @param device sostituto di `DeviceService`
 * @returns il servizio sotto test
 */
function createService(device: Partial<DeviceService>): GeolocationService {
  TestBed.configureTestingModule({
    providers: [
      GeolocationService,
      provideMockStore({}),
      {provide: DeviceService, useValue: device},
      {provide: UgcTrackStatsService, useValue: {params$: of(UGC_TRACK_STATS_DEFAULT_PARAMS)}},
    ],
  });
  return TestBed.inject(GeolocationService);
}

/**
 * Stato del GPS e watcher web (oc:8766). Si prova il ramo browser: il plugin nativo è un Proxy
 * Capacitor che `spyOn` non intercetta.
 */
describe('GeolocationService — stato del GPS (web)', () => {
  let svc: GeolocationService;
  let watchSpy: jasmine.Spy;
  let clearSpy: jasmine.Spy;
  let nextId: number;
  let success: PositionCallback;
  let failure: PositionErrorCallback;
  let options: PositionOptions;

  beforeEach(() => {
    TestBed.resetTestingModule();
    nextId = 1;
    watchSpy = spyOn(navigator.geolocation, 'watchPosition').and.callFake(
      (s: PositionCallback, e: PositionErrorCallback, o: PositionOptions) => {
        success = s;
        failure = e;
        options = o;
        return nextId++;
      },
    );
    clearSpy = spyOn(navigator.geolocation, 'clearWatch');
    svc = createService({isBrowser: true});
  });

  afterEach(() => TestBed.resetTestingModule());

  /** Ultimo valore emesso da `gpsStatus$`. */
  function status(): GpsStatus {
    return svc.gpsStatus;
  }

  /** Posizione web finta con la precisione indicata. */
  function position(accuracy: number): GeolocationPosition {
    return {
      timestamp: Date.now(),
      coords: {latitude: 43.7, longitude: 10.4, accuracy, altitude: null, altitudeAccuracy: null, heading: null, speed: null},
    } as GeolocationPosition;
  }

  it('gpsStatus$ parte da off', () => {
    expect(status()).toBe('off');
  });

  it('startNavigation porta in searching e apre il watcher web con enableHighAccuracy true', () => {
    svc.startNavigation();
    expect(status()).toBe('searching');
    expect(watchSpy).toHaveBeenCalledTimes(1);
    expect(options.enableHighAccuracy).toBeTrue();
  });

  it('il passaggio a registrazione chiude il watcher web precedente', () => {
    svc.startNavigation();
    svc.startRecording();
    expect(clearSpy).toHaveBeenCalledOnceWith(1);
    expect(watchSpy).toHaveBeenCalledTimes(2);
  });

  it('un fix dal watcher web porta in ok', () => {
    svc.startNavigation();
    success(position(10));
    expect(status()).toBe('ok');
  });

  it("l'errore web PERMISSION_DENIED porta in denied", () => {
    svc.startNavigation();
    failure({code: 1} as GeolocationPositionError);
    expect(status()).toBe('denied');
  });

  it('gpsStatus$ è in sola lettura', () => {
    expect((svc.gpsStatus$ as any).next).toBeUndefined();
  });

  it('dopo un permesso negato, startNavigation fa ripartire il watcher web', () => {
    svc.startNavigation();
    failure({code: 1} as GeolocationPositionError);
    svc.startNavigation();
    expect(watchSpy).toHaveBeenCalledTimes(2);
    expect(clearSpy).toHaveBeenCalledWith(1);
    expect(status()).toBe('searching');
  });

  it('stopAll porta in off e chiude il watcher web', async () => {
    svc.startNavigation();
    await svc.stopAll();
    expect(status()).toBe('off');
    expect(clearSpy).toHaveBeenCalledWith(1);
  });
});

/**
 * Watcher nativo (oc:8766): le chiamate al plugin passano da metodi del servizio, spiabili; il
 * plugin è un Proxy Capacitor che `spyOn` non intercetta.
 */
describe('GeolocationService — watcher nativo', () => {
  let svc: GeolocationService;
  let device: {isBrowser: boolean; isIos: boolean; isAndroid: boolean};
  let callbacks: Array<(location?: any, error?: any) => void>;
  let removeSpy: jasmine.Spy;

  beforeEach(() => {
    TestBed.resetTestingModule();
    callbacks = [];
    spyOn<any>(GeolocationService.prototype, '_addNativeWatcher').and.callFake((_opts: any, cb: any) => {
      callbacks.push(cb);
      return Promise.resolve(`w${callbacks.length}`);
    });
    removeSpy = spyOn<any>(GeolocationService.prototype, '_removeNativeWatcherById').and.returnValue(Promise.resolve());
    device = {isBrowser: false, isIos: true, isAndroid: false};
    svc = createService(device);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('iOS: NOT_AUTHORIZED porta in denied e rimuove il watcher', async () => {
    svc.startNavigation();
    await Promise.resolve();
    callbacks[0](undefined, {code: 'NOT_AUTHORIZED', message: 'Permission denied.'});
    expect(svc.gpsStatus).toBe('denied');
    expect(removeSpy).toHaveBeenCalledWith('w1');
  });

  it('un errore in ritardo da un watcher già rimosso non tocca quello attivo', async () => {
    svc.startNavigation();
    await Promise.resolve();
    await svc.stopAll();
    svc.startNavigation();
    await Promise.resolve();
    removeSpy.calls.reset();
    callbacks[0](undefined, {code: 'NOT_AUTHORIZED', message: 'Permission denied.'});
    expect(svc.gpsStatus).toBe('searching');
    expect(removeSpy).not.toHaveBeenCalled();
  });

  it('un fix in ritardo da un watcher già rimosso non cambia lo stato', async () => {
    svc.startNavigation();
    await Promise.resolve();
    await svc.stopAll();
    callbacks[0]({latitude: 43.7, longitude: 10.4, accuracy: 10, time: Date.now()});
    expect(svc.gpsStatus).toBe('off');
  });

  it('Android: NOT_AUTHORIZED non rimuove il watcher, e la posizione approssimativa arriva come segnale debole', async () => {
    device.isIos = false;
    device.isAndroid = true;
    svc.startNavigation();
    await Promise.resolve();
    // posizione approssimativa: il plugin rifiuta il permesso ma il watcher continua a consegnare fix
    callbacks[0](undefined, {code: 'NOT_AUTHORIZED', message: 'User denied location permission'});
    expect(svc.gpsStatus).toBe('denied');
    callbacks[0]({latitude: 43.7, longitude: 10.4, accuracy: 1200, time: Date.now()});
    callbacks[0]({latitude: 43.7, longitude: 10.41, accuracy: 1500, time: Date.now()});
    expect(removeSpy).not.toHaveBeenCalled();
    expect(svc.gpsStatus).toBe('poor');
  });

  it("Android: un NOT_AUTHORIZED dopo fix già arrivati non porta in denied", async () => {
    device.isIos = false;
    device.isAndroid = true;
    svc.startNavigation();
    await Promise.resolve();
    // posizione approssimativa: i fix arrivano mentre la finestra del permesso è aperta,
    // l'errore arriva quando l'utente la chiude tenendo l'approssimata
    callbacks[0]({latitude: 43.7, longitude: 10.4, accuracy: 1200, time: Date.now()});
    callbacks[0]({latitude: 43.7, longitude: 10.41, accuracy: 1500, time: Date.now()});
    callbacks[0](undefined, {code: 'NOT_AUTHORIZED', message: 'User denied location permission'});
    expect(svc.gpsStatus).toBe('poor');
    expect(removeSpy).not.toHaveBeenCalled();
  });

  it('Android: la localizzazione spenta dopo fix già arrivati porta comunque in disabled', async () => {
    device.isIos = false;
    device.isAndroid = true;
    svc.startNavigation();
    await Promise.resolve();
    callbacks[0]({latitude: 43.7, longitude: 10.4, accuracy: 10, time: Date.now()});
    callbacks[0](undefined, {code: 'NOT_AUTHORIZED', message: 'Location services disabled.'});
    expect(svc.gpsStatus).toBe('disabled');
  });
});
