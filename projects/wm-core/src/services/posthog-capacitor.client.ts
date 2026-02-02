import {Inject, Injectable} from '@angular/core';
import {Capacitor} from '@capacitor/core';
import {Posthog, SetupOptions} from '@capawesome/capacitor-posthog';
import {POSTHOG_CONFIG} from '@wm-core/store/conf/conf.token';
import {WmPosthogClient, WmPosthogConfig, WmPosthogProps} from '@wm-types/posthog';

@Injectable()
export class PosthogCapacitorClient implements WmPosthogClient {
  private readonly isNativePlatform: boolean;

  private initialized = false;
  private sessionRecordingStarted = false;

  constructor(@Inject(POSTHOG_CONFIG) private config: WmPosthogConfig) {
    const platform = Capacitor.getPlatform();
    this.isNativePlatform = platform === 'ios' || platform === 'android';
  }

  async capture(event: string, props: WmPosthogProps = {}): Promise<void> {
    // Lazy initialization per capture
    await this.init();
    if (!this.initialized) {
      console.warn('[PostHog] Cannot capture event - PostHog not initialized');
      return;
    }
    console.log(`[PostHog] Capturing event '${event}' with properties:`, props);
    try {
      await Posthog.capture({event, properties: props});
      console.log(`[PostHog] Event '${event}' captured successfully`);

      // `flush()` NON è implementato sul web nel plugin, quindi lo chiamiamo solo su native.
      if (this.isNativePlatform) {
        await Posthog.flush();
        console.log(`[PostHog] Flushed events to server`);
      }
    } catch (error) {
      console.error(`[PostHog] Failed to capture event '${event}':`, error);
      throw error;
    }
  }

  async identify(distinctId: string, props: WmPosthogProps = {}): Promise<void> {
    // Lazy initialization per identify
    await this.init();
    if (!this.initialized) return;
    await Posthog.identify({distinctId, userProperties: props});
    // Avvia il session replay dopo identify se non è già stato avviato
    await this.ensureSessionRecording();
  }

  async initAndRegister(props: WmPosthogProps, enabled?: boolean): Promise<void> {
    if (enabled) {
      this.config.enabled = enabled;
    }
    // Inizializza PostHog
    await this.init();
    if (!this.initialized) {
      console.warn('[PostHog] Cannot register properties: PostHog not initialized');
      return;
    }

    console.log('[PostHog] Registering properties (raw):', JSON.stringify(props, null, 2));

    // Identifica e verifica che tutte le proprietà siano definite e non vuote
    const invalidProps: Array<{key: string; value: any; reason: string}> = [];

    for (const [key, value] of Object.entries(props ?? {})) {
      if (value === undefined) {
        invalidProps.push({key, value, reason: 'undefined'});
        console.error(`[PostHog] ERROR: Property '${key}' is UNDEFINED!`);
      } else if (value === null) {
        invalidProps.push({key, value, reason: 'null'});
        console.error(`[PostHog] ERROR: Property '${key}' is NULL!`);
      } else if (typeof value === 'string' && value.trim() === '') {
        invalidProps.push({key, value, reason: 'empty string'});
        console.error(`[PostHog] ERROR: Property '${key}' is EMPTY STRING!`);
      } else {
        console.log(`[PostHog] Property '${key}' is valid:`, typeof value, value);
      }
    }

    // Se ci sono proprietà invalide, lancia un errore
    if (invalidProps.length > 0) {
      const errorMsg = `PostHog register failed: Invalid properties: ${invalidProps
        .map(p => `${p.key} (${p.reason})`)
        .join(', ')}. All properties must be defined and non-empty before calling register.`;
      console.error('[PostHog]', errorMsg);
      console.error('[PostHog] Invalid properties details:', invalidProps);
      throw new Error(errorMsg);
    }

    // Registra tutte le proprietà (ora siamo sicuri che sono tutte valide)
    // Il plugin nativo accetta 'any' come tipo, quindi passiamo il valore originale
    for (const [key, value] of Object.entries(props ?? {})) {
      console.log(
        `[PostHog] Registering property '${key}':`,
        typeof value,
        value,
        'JSON:',
        JSON.stringify(value),
      );
      try {
        // WORKAROUND iOS: il plugin iOS usa getObject("value") e con primitivi può fallire.
        // Quindi wrappiamo SOLO su piattaforme native; su web passiamo il valore così com'è.
        const valueToSend = this.isNativePlatform ? {_value: value} : value;
        if (this.isNativePlatform) {
          console.log(`[PostHog] Wrapping value for iOS compatibility:`, valueToSend);
        }
        await Posthog.register({key, value: valueToSend});
        console.log(`[PostHog] Successfully registered property '${key}'`);
      } catch (error) {
        console.error(`[PostHog] Failed to register property '${key}':`, error);
        console.error(
          `[PostHog] Property details: key="${key}", value=`,
          value,
          `type=${typeof value}, JSON=${JSON.stringify(value)}`,
        );
        // Non lanciare l'errore, continua con le altre proprietà
        // throw error;
      }
    }

    // Avvia il session replay dopo aver registrato le proprietà
    await this.ensureSessionRecording();

    // Invia un evento di inizio sessione dopo aver registrato le proprietà
    // Questo assicura che la sessione venga tracciata con tutte le proprietà super
    try {
      await Posthog.capture({event: '$session_start', properties: {}});
      // `flush()` NON è implementato sul web nel plugin, quindi lo chiamiamo solo su native.
      if (this.isNativePlatform) {
        await Posthog.flush();
      }
      console.log('[PostHog] Session start event sent');
    } catch (error) {
      console.warn('[PostHog] Failed to send session start event:', error);
    }
  }

  async reset(): Promise<void> {
    if (this.sessionRecordingStarted && this.isNativePlatform) {
      try {
        await Posthog.stopSessionRecording();
        console.log('[PostHog] Session recording stopped');
      } catch (error) {
        console.error('[PostHog] Failed to stop session recording:', error);
      }
    }
    await Posthog.reset();
    this.initialized = false;
    this.sessionRecordingStarted = false;
  }

  private async init(): Promise<void> {
    if (this.initialized) {
      console.log('[PostHog] Already initialized');
      return;
    }
    if (!this.config?.enabled) {
      console.warn('[PostHog] Initialization skipped: PostHog is disabled');
      return;
    }
    if (!this.config?.apiKey) {
      console.warn('[PostHog] Initialization skipped: API key is missing');
      return;
    }

    console.log('[PostHog] Initializing with config:', {
      apiKey: this.config.apiKey ? `${this.config.apiKey.substring(0, 10)}...` : 'missing',
      host: this.config.host || 'default',
      enabled: this.config.enabled,
    });

    try {
      const options: SetupOptions = {
        apiKey: this.config.apiKey,
        host: this.config.host,
        enableSessionReplay: true,
        sessionReplayConfig: {
          screenshotMode: true,
          maskAllTextInputs: false,
          maskAllImages: false,
          maskAllSandboxedViews: false,
          captureNetworkTelemetry: false,
          debouncerDelay: 1.0,
        },
      };
      await Posthog.setup(options);
      this.initialized = true;
      console.log('[PostHog] Successfully initialized');
      console.log(
        '[PostHog] Session replay enabled in setup, will start after properties are registered',
      );
    } catch (error) {
      console.error('[PostHog] Initialization failed:', error);
      this.initialized = false;
    }
  }

  /**
   * Assicura che il session recording sia avviato (solo su piattaforme native)
   * Viene chiamato dopo initAndRegister e identify per garantire che sia avviato
   * solo quando PostHog è completamente configurato
   */
  private async ensureSessionRecording(): Promise<void> {
    if (!this.initialized) {
      console.warn('[PostHog] Cannot start session recording - PostHog not initialized');
      return;
    }

    if (this.sessionRecordingStarted) {
      console.log('[PostHog] Session recording already started');
      return;
    }

    try {
      console.log('[PostHog] Starting session recording...');
      await Posthog.startSessionRecording();
      this.sessionRecordingStarted = true;
      console.log('[PostHog] Session recording started successfully');
    } catch (error) {
      console.error('[PostHog] Failed to start session recording:', error);
      // Non blocchiamo l'esecuzione, ma loggiamo l'errore
    }
  }
}
