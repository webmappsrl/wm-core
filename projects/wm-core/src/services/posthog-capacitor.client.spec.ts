import {TestBed} from '@angular/core/testing';
import {PosthogCapacitorClient} from './posthog-capacitor.client';
import {PosthogAdapter} from './posthog.adapter';
import {POSTHOG_CONFIG} from '@wm-core/store/conf/conf.token';
import {WmPosthogConfig} from '@wm-types/posthog';

describe('PosthogCapacitorClient', () => {
  let client: PosthogCapacitorClient;
  let mockConfig: WmPosthogConfig;
  let mockAdapter: jasmine.SpyObj<PosthogAdapter>;

  beforeEach(() => {
    // Configurazione di default
    mockConfig = {
      apiKey: 'test-api-key',
      enabled: true,
      host: 'https://posthog.example.com',
    };

    // Crea mock dell'adapter con metodi e proprietà
    mockAdapter = jasmine.createSpyObj(
      'PosthogAdapter',
      ['setup', 'capture', 'identify', 'register', 'reset', 'startSessionRecording', 'stopSessionRecording'],
      {isNativePlatform: true}, // Default: piattaforma nativa
    );

    // Default mock implementations
    mockAdapter.setup.and.returnValue(Promise.resolve());
    mockAdapter.capture.and.returnValue(Promise.resolve());
    mockAdapter.identify.and.returnValue(Promise.resolve());
    mockAdapter.register.and.returnValue(Promise.resolve());
    mockAdapter.reset.and.returnValue(Promise.resolve());
    mockAdapter.startSessionRecording.and.returnValue(Promise.resolve());
    mockAdapter.stopSessionRecording.and.returnValue(Promise.resolve());
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  // Helper per creare una nuova istanza del client via TestBed
  const createClient = (config?: Partial<WmPosthogConfig>): PosthogCapacitorClient => {
    const finalConfig = {...mockConfig, ...config};

    TestBed.configureTestingModule({
      providers: [
        PosthogCapacitorClient,
        {provide: POSTHOG_CONFIG, useValue: finalConfig},
        {provide: PosthogAdapter, useValue: mockAdapter},
      ],
    });

    return TestBed.inject(PosthogCapacitorClient);
  };

  describe('Inizializzazione con enabled option', () => {
    it('dovrebbe inizializzare PostHog quando enabled è true nella config', async () => {
      client = createClient({enabled: true});

      await client.initAndRegister({appName: 'TestApp'});

      expect(mockAdapter.setup).toHaveBeenCalledTimes(1);
      expect(client.isInitialized).toBe(true);
    });

    it('NON dovrebbe inizializzare PostHog quando enabled è false nella config', async () => {
      client = createClient({enabled: false});

      await client.initAndRegister({appName: 'TestApp'});

      expect(mockAdapter.setup).not.toHaveBeenCalled();
      expect(client.isInitialized).toBe(false);
    });

    it('dovrebbe sovrascrivere config.enabled con options.enabled = true', async () => {
      client = createClient({enabled: false});

      await client.initAndRegister({appName: 'TestApp'}, {enabled: true});

      expect(mockAdapter.setup).toHaveBeenCalledTimes(1);
      expect(client.isInitialized).toBe(true);
    });

    it('dovrebbe sovrascrivere config.enabled con options.enabled = false', async () => {
      client = createClient({enabled: true});

      await client.initAndRegister({appName: 'TestApp'}, {enabled: false});

      expect(mockAdapter.setup).not.toHaveBeenCalled();
      expect(client.isInitialized).toBe(false);
    });

    it('NON dovrebbe inizializzare PostHog senza apiKey', async () => {
      spyOn(console, 'warn');
      client = createClient({apiKey: ''});

      await client.initAndRegister({appName: 'TestApp'});

      expect(mockAdapter.setup).not.toHaveBeenCalled();
      expect(client.isInitialized).toBe(false);
    });
  });

  describe('Session Recording con recordingEnabled option', () => {
    it('dovrebbe abilitare il recording quando recordingEnabled è true e probability è 1', async () => {
      client = createClient();

      await client.initAndRegister(
        {appName: 'TestApp'},
        {recordingEnabled: true, recordingProbability: 1},
      );

      expect(mockAdapter.setup).toHaveBeenCalledWith(
        jasmine.objectContaining({
          enableSessionReplay: true,
        }),
      );
    });

    it('NON dovrebbe abilitare il recording quando recordingEnabled è false', async () => {
      spyOn(console, 'log');
      client = createClient();

      await client.initAndRegister(
        {appName: 'TestApp'},
        {recordingEnabled: false, recordingProbability: 1},
      );

      expect(mockAdapter.setup).toHaveBeenCalledWith(
        jasmine.objectContaining({
          enableSessionReplay: false,
        }),
      );
      expect(console.log).toHaveBeenCalledWith('[PostHog] Session recording: disabled');
    });

    it('NON dovrebbe abilitare il recording quando recordingEnabled non è specificato (default false)', async () => {
      spyOn(console, 'log');
      client = createClient();

      await client.initAndRegister({appName: 'TestApp'});

      expect(mockAdapter.setup).toHaveBeenCalledWith(
        jasmine.objectContaining({
          enableSessionReplay: false,
        }),
      );
    });
  });

  describe('Session Recording con recordingProbability option', () => {
    it('NON dovrebbe abilitare il recording quando probability è 0', async () => {
      spyOn(console, 'log');
      client = createClient();

      await client.initAndRegister(
        {appName: 'TestApp'},
        {recordingEnabled: true, recordingProbability: 0},
      );

      expect(mockAdapter.setup).toHaveBeenCalledWith(
        jasmine.objectContaining({
          enableSessionReplay: false,
        }),
      );
      expect(console.log).toHaveBeenCalledWith('[PostHog] Session recording: disabled');
    });

    it('dovrebbe SEMPRE abilitare il recording quando probability è 1', async () => {
      spyOn(console, 'log');
      client = createClient();

      await client.initAndRegister(
        {appName: 'TestApp'},
        {recordingEnabled: true, recordingProbability: 1},
      );

      expect(mockAdapter.setup).toHaveBeenCalledWith(
        jasmine.objectContaining({
          enableSessionReplay: true,
        }),
      );
      expect(console.log).toHaveBeenCalledWith('[PostHog] Session recording: enabled');
    });

    it('dovrebbe saltare il recording quando Math.random > probability', async () => {
      spyOn(console, 'log');
      const probability = 0.3;

      // Mock Math.random per restituire un valore > probability
      spyOn(Math, 'random').and.returnValue(0.8);

      client = createClient();
      await client.initAndRegister(
        {appName: 'TestApp'},
        {recordingEnabled: true, recordingProbability: probability},
      );

      expect(mockAdapter.setup).toHaveBeenCalledWith(
        jasmine.objectContaining({
          enableSessionReplay: false,
        }),
      );
      expect(console.log).toHaveBeenCalledWith('[PostHog] Session recording: disabled');
    });

    it('dovrebbe abilitare il recording quando Math.random <= probability', async () => {
      spyOn(console, 'log');
      const probability = 0.7;

      // Mock Math.random per restituire un valore <= probability
      spyOn(Math, 'random').and.returnValue(0.5);

      client = createClient();
      await client.initAndRegister(
        {appName: 'TestApp'},
        {recordingEnabled: true, recordingProbability: probability},
      );

      expect(mockAdapter.setup).toHaveBeenCalledWith(
        jasmine.objectContaining({
          enableSessionReplay: true,
        }),
      );
      expect(console.log).toHaveBeenCalledWith('[PostHog] Session recording: enabled');
    });

    it('dovrebbe rispettare la probabilità del 50% correttamente (valore alla soglia)', async () => {
      spyOn(console, 'log');

      // Test con valore esattamente alla soglia (0.5 <= 0.5 = true)
      spyOn(Math, 'random').and.returnValue(0.5);

      client = createClient();
      await client.initAndRegister(
        {appName: 'TestApp'},
        {recordingEnabled: true, recordingProbability: 0.5},
      );

      expect(mockAdapter.setup).toHaveBeenCalledWith(
        jasmine.objectContaining({
          enableSessionReplay: true,
        }),
      );
    });

    it('dovrebbe NON abilitare il recording con valore appena sopra la soglia', async () => {
      spyOn(console, 'log');

      // Test con valore appena sopra la soglia (0.51 > 0.5 = false)
      spyOn(Math, 'random').and.returnValue(0.51);

      client = createClient();
      await client.initAndRegister(
        {appName: 'TestApp'},
        {recordingEnabled: true, recordingProbability: 0.5},
      );

      expect(mockAdapter.setup).toHaveBeenCalledWith(
        jasmine.objectContaining({
          enableSessionReplay: false,
        }),
      );
    });
  });

  describe('Combinazioni di opzioni', () => {
    it('dovrebbe gestire enabled=false con recordingEnabled=true senza errori', async () => {
      client = createClient();

      await client.initAndRegister(
        {appName: 'TestApp'},
        {enabled: false, recordingEnabled: true, recordingProbability: 1},
      );

      expect(mockAdapter.setup).not.toHaveBeenCalled();
      expect(client.isInitialized).toBe(false);
    });

    it('dovrebbe gestire enabled=true, recordingEnabled=true, probability=0', async () => {
      spyOn(console, 'log');
      client = createClient();

      await client.initAndRegister(
        {appName: 'TestApp'},
        {enabled: true, recordingEnabled: true, recordingProbability: 0},
      );

      expect(mockAdapter.setup).toHaveBeenCalledTimes(1);
      expect(mockAdapter.setup).toHaveBeenCalledWith(
        jasmine.objectContaining({
          enableSessionReplay: false,
        }),
      );
      expect(client.isInitialized).toBe(true);
    });

    it('dovrebbe gestire tutte le opzioni impostate correttamente', async () => {
      spyOn(Math, 'random').and.returnValue(0.1);
      client = createClient();

      await client.initAndRegister(
        {appName: 'TestApp'},
        {enabled: true, recordingEnabled: true, recordingProbability: 0.5},
      );

      expect(mockAdapter.setup).toHaveBeenCalledTimes(1);
      expect(mockAdapter.setup).toHaveBeenCalledWith(
        jasmine.objectContaining({
          enableSessionReplay: true,
        }),
      );
      expect(client.isInitialized).toBe(true);
    });
  });

  describe('Capture e Identify con stato di inizializzazione', () => {
    it('dovrebbe catturare eventi quando PostHog è inizializzato', async () => {
      client = createClient();
      await client.initAndRegister({appName: 'TestApp'});

      await client.capture('test_event', {key: 'value'});

      // 2 chiamate: una per $session_start durante init, una per test_event
      expect(mockAdapter.capture).toHaveBeenCalledTimes(2);
      expect(mockAdapter.capture).toHaveBeenCalledWith({
        event: 'test_event',
        properties: {key: 'value'},
      });
    });

    it('NON dovrebbe catturare eventi quando PostHog NON è inizializzato', async () => {
      client = createClient({enabled: false});
      await client.initAndRegister({appName: 'TestApp'});

      await client.capture('test_event', {key: 'value'});

      expect(mockAdapter.capture).not.toHaveBeenCalled();
    });

    it('dovrebbe identificare utenti quando PostHog è inizializzato', async () => {
      client = createClient();
      await client.initAndRegister({appName: 'TestApp'});

      await client.identify('user123', {email: 'test@example.com'});

      expect(mockAdapter.identify).toHaveBeenCalledWith({
        distinctId: 'user123',
        userProperties: {email: 'test@example.com'},
      });
    });

    it('NON dovrebbe identificare utenti quando PostHog NON è inizializzato', async () => {
      client = createClient({enabled: false});
      await client.initAndRegister({appName: 'TestApp'});

      await client.identify('user123', {email: 'test@example.com'});

      expect(mockAdapter.identify).not.toHaveBeenCalled();
    });
  });

  describe('Reset', () => {
    it('dovrebbe resettare PostHog e fermare il session recording se era attivo', async () => {
      client = createClient();
      await client.initAndRegister(
        {appName: 'TestApp'},
        {recordingEnabled: true, recordingProbability: 1},
      );

      await client.reset();

      expect(mockAdapter.stopSessionRecording).toHaveBeenCalledTimes(1);
      expect(mockAdapter.reset).toHaveBeenCalledTimes(1);
      expect(client.isInitialized).toBe(false);
    });

    it('NON dovrebbe fermare il session recording se non era stato avviato', async () => {
      spyOn(console, 'log');
      client = createClient();
      await client.initAndRegister({appName: 'TestApp'}, {recordingEnabled: false});

      await client.reset();

      expect(mockAdapter.stopSessionRecording).not.toHaveBeenCalled();
      expect(mockAdapter.reset).toHaveBeenCalledTimes(1);
    });
  });

  describe('Piattaforme diverse', () => {
    // Helper per creare mock adapter con isNativePlatform specifico
    const createMockAdapterWithPlatform = (isNative: boolean): jasmine.SpyObj<PosthogAdapter> => {
      const adapter = jasmine.createSpyObj(
        'PosthogAdapter',
        ['setup', 'capture', 'identify', 'register', 'reset', 'startSessionRecording', 'stopSessionRecording'],
        {isNativePlatform: isNative},
      );
      adapter.setup.and.returnValue(Promise.resolve());
      adapter.capture.and.returnValue(Promise.resolve());
      adapter.identify.and.returnValue(Promise.resolve());
      adapter.register.and.returnValue(Promise.resolve());
      adapter.reset.and.returnValue(Promise.resolve());
      adapter.startSessionRecording.and.returnValue(Promise.resolve());
      adapter.stopSessionRecording.and.returnValue(Promise.resolve());
      return adapter;
    };

    it('dovrebbe usare il workaround per piattaforma nativa (iOS/Android)', async () => {
      const nativeAdapter = createMockAdapterWithPlatform(true);

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          PosthogCapacitorClient,
          {provide: POSTHOG_CONFIG, useValue: mockConfig},
          {provide: PosthogAdapter, useValue: nativeAdapter},
        ],
      });
      client = TestBed.inject(PosthogCapacitorClient);

      await client.initAndRegister({appName: 'TestApp'});

      // Verifica che il registro usi il workaround per piattaforme native
      expect(nativeAdapter.register).toHaveBeenCalledWith({
        key: 'appName',
        value: {_value: 'TestApp'},
      });
    });

    it('dovrebbe usare valori normali per la piattaforma web', async () => {
      const webAdapter = createMockAdapterWithPlatform(false);

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          PosthogCapacitorClient,
          {provide: POSTHOG_CONFIG, useValue: mockConfig},
          {provide: PosthogAdapter, useValue: webAdapter},
        ],
      });
      client = TestBed.inject(PosthogCapacitorClient);

      await client.initAndRegister({appName: 'TestApp'});

      expect(webAdapter.register).toHaveBeenCalledWith({
        key: 'appName',
        value: 'TestApp',
      });
    });
  });

  describe('Validazione proprietà', () => {
    it('dovrebbe lanciare errore per proprietà undefined', async () => {
      spyOn(console, 'error');
      client = createClient();

      await expectAsync(
        client.initAndRegister({appName: 'TestApp', invalidProp: undefined}),
      ).toBeRejectedWithError(/Invalid properties.*invalidProp.*undefined/);
    });

    it('dovrebbe lanciare errore per proprietà null', async () => {
      spyOn(console, 'error');
      client = createClient();

      await expectAsync(
        client.initAndRegister({appName: 'TestApp', invalidProp: null}),
      ).toBeRejectedWithError(/Invalid properties.*invalidProp.*null/);
    });

    it('dovrebbe lanciare errore per proprietà stringa vuota', async () => {
      spyOn(console, 'error');
      client = createClient();

      await expectAsync(
        client.initAndRegister({appName: 'TestApp', invalidProp: '  '}),
      ).toBeRejectedWithError(/Invalid properties.*invalidProp.*empty string/);
    });

    it('dovrebbe accettare proprietà valide', async () => {
      client = createClient();

      await expectAsync(
        client.initAndRegister({
          appName: 'TestApp',
          version: '1.0.0',
          numericProp: 123,
          boolProp: true,
        }),
      ).toBeResolved();

      expect(mockAdapter.register).toHaveBeenCalledTimes(4);
    });
  });

  describe('Verifica chiamate setup con opzioni corrette', () => {
    it('dovrebbe chiamare setup con enableSessionReplay=false quando recording disabilitato', async () => {
      client = createClient({
        apiKey: 'my-api-key',
        host: 'https://my-posthog.com',
        enabled: true,
      });

      await client.initAndRegister({appName: 'TestApp'});

      expect(mockAdapter.setup).toHaveBeenCalledWith(
        jasmine.objectContaining({
          apiKey: 'my-api-key',
          host: 'https://my-posthog.com',
          enableSessionReplay: false,
        }),
      );
    });

    it('dovrebbe chiamare setup con enableSessionReplay=true quando recording abilitato', async () => {
      client = createClient({
        apiKey: 'my-api-key',
        host: 'https://my-posthog.com',
        enabled: true,
      });

      await client.initAndRegister(
        {appName: 'TestApp'},
        {recordingEnabled: true, recordingProbability: 1},
      );

      expect(mockAdapter.setup).toHaveBeenCalledWith(
        jasmine.objectContaining({
          apiKey: 'my-api-key',
          host: 'https://my-posthog.com',
          enableSessionReplay: true,
        }),
      );
    });

    it('dovrebbe includere sessionReplayConfig solo quando recording è abilitato', async () => {
      client = createClient();

      await client.initAndRegister(
        {appName: 'TestApp'},
        {recordingEnabled: true, recordingProbability: 1},
      );

      expect(mockAdapter.setup).toHaveBeenCalledWith(
        jasmine.objectContaining({
          enableSessionReplay: true,
          sessionReplayConfig: jasmine.objectContaining({
            screenshotMode: true,
            maskAllTextInputs: false,
            maskAllImages: false,
          }),
        }),
      );
    });

    it('NON dovrebbe includere sessionReplayConfig quando recording è disabilitato', async () => {
      client = createClient();

      await client.initAndRegister({appName: 'TestApp'}, {recordingEnabled: false});

      const setupCall = mockAdapter.setup.calls.mostRecent().args[0];
      expect(setupCall.sessionReplayConfig).toBeUndefined();
    });
  });
});
