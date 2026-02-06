import {Inject, Injectable} from '@angular/core';
import {Capacitor} from '@capacitor/core';
import {Posthog, SetupOptions} from '@capawesome/capacitor-posthog';
import {POSTHOG_CONFIG} from '@wm-core/store/conf/conf.token';
import {WmPosthogClient, WmPosthogConfig, WmPosthogInitOptions, WmPosthogProps} from '@wm-types/posthog';

@Injectable()
export class PosthogCapacitorClient implements WmPosthogClient {
  private readonly isNativePlatform: boolean;
  private readonly platform: string;

  private initialized = false;
  private sessionRecordingStarted = false;
  private recordingProbability = 0;

  constructor(@Inject(POSTHOG_CONFIG) private config: WmPosthogConfig) {
    this.platform = Capacitor.getPlatform();
    this.isNativePlatform = this.platform === 'ios' || this.platform === 'android';
  }

  /**
   * Getter pubblico per verificare lo stato di inizializzazione
   */
  get isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Cattura un evento PostHog.
   * PostHog deve essere inizializzato tramite initAndRegister() prima di poter catturare eventi.
   */
  async capture(event: string, props: WmPosthogProps = {}): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      await Posthog.capture({event, properties: props});
    } catch (error) {
      console.error(`[PostHog] Failed to capture '${event}':`, error);
    }
  }

  /**
   * Identifica un utente in PostHog.
   * PostHog deve essere inizializzato tramite initAndRegister() prima.
   */
  async identify(distinctId: string, props: WmPosthogProps = {}): Promise<void> {
    if (!this.initialized) {
      return;
    }

    await Posthog.identify({distinctId, userProperties: props});
    await this.ensureSessionRecording();
  }

  /**
   * Inizializza PostHog e registra le proprietà super.
   * Questo è l'unico punto di ingresso per l'inizializzazione.
   */
  async initAndRegister(props: WmPosthogProps, options?: WmPosthogInitOptions): Promise<void> {
    if (options?.enabled !== undefined) {
      this.config.enabled = options.enabled;
    }
    if (options?.recordingProbability !== undefined) {
      this.recordingProbability = options.recordingProbability;
    }

    await this.init();
    if (!this.initialized) {
      return;
    }

    // Valida e registra le proprietà
    const invalidProps = this.validateProps(props);
    if (invalidProps.length > 0) {
      const errorMsg = `Invalid properties: ${invalidProps.map(p => `${p.key} (${p.reason})`).join(', ')}`;
      console.error('[PostHog]', errorMsg);
      throw new Error(errorMsg);
    }

    await this.registerProps(props);
    await this.ensureSessionRecording();

    // Invia evento di inizio sessione
    try {
      await this.capture('$session_start', {});
    } catch (error) {
      console.error('[PostHog] Failed to send session start event:', error);
    }
  }

  /**
   * Resetta PostHog (logout utente)
   */
  async reset(): Promise<void> {
    if (this.sessionRecordingStarted && this.isNativePlatform) {
      try {
        await Posthog.stopSessionRecording();
      } catch (error) {
        console.error('[PostHog] Failed to stop session recording:', error);
      }
    }

    await Posthog.reset();
    this.initialized = false;
    this.sessionRecordingStarted = false;
  }

  /**
   * Inizializza il plugin PostHog
   */
  private async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (!this.config?.enabled) {
      return;
    }

    if (!this.config?.apiKey) {
      console.warn('[PostHog] Initialization skipped: API key missing');
      return;
    }

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
    } catch (error) {
      console.error('[PostHog] Initialization failed:', error);
      this.initialized = false;
    }
  }

  /**
   * Valida le proprietà prima della registrazione
   */
  private validateProps(props: WmPosthogProps): Array<{key: string; reason: string}> {
    const invalid: Array<{key: string; reason: string}> = [];

    for (const [key, value] of Object.entries(props ?? {})) {
      if (value === undefined) {
        invalid.push({key, reason: 'undefined'});
      } else if (value === null) {
        invalid.push({key, reason: 'null'});
      } else if (typeof value === 'string' && value.trim() === '') {
        invalid.push({key, reason: 'empty string'});
      }
    }

    return invalid;
  }

  /**
   * Registra le proprietà super in PostHog
   */
  private async registerProps(props: WmPosthogProps): Promise<void> {
    for (const [key, value] of Object.entries(props ?? {})) {
      try {
        // WORKAROUND iOS: il plugin iOS usa getObject("value") e con primitivi può fallire
        const valueToSend = this.isNativePlatform ? {_value: value} : value;
        await Posthog.register({key, value: valueToSend});
      } catch (error) {
        console.error(`[PostHog] Failed to register '${key}':`, error);
      }
    }
  }

  /**
   * Avvia il session recording se non è già attivo e se la probabilità lo consente
   */
  private async ensureSessionRecording(): Promise<void> {
    if (!this.initialized || this.sessionRecordingStarted) {
      return;
    }

    // Controlla la probabilità di registrazione (0-1, es. 0.5 = 50%)
    if (this.recordingProbability <= 0) {
      console.log('[PostHog] Session recording disabled (probability = 0)');
      return;
    }

    const randomValue = Math.random();
    if (randomValue > this.recordingProbability) {
      console.log(
        `[PostHog] Session recording skipped (random: ${randomValue.toFixed(3)}, probability: ${this.recordingProbability})`,
      );
      return;
    }

    console.log(
      `[PostHog] Session recording enabled (random: ${randomValue.toFixed(3)}, probability: ${this.recordingProbability})`,
    );

    try {
      await Posthog.startSessionRecording();
      this.sessionRecordingStarted = true;
    } catch (error) {
      console.error('[PostHog] Failed to start session recording:', error);
    }
  }
}
