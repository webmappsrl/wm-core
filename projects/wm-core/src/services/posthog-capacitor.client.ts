import {Inject, Injectable} from '@angular/core';
import {SetupOptions} from '@capawesome/capacitor-posthog';
import {POSTHOG_CONFIG} from '@wm-core/store/conf/conf.token';
import {WmPosthogClient, WmPosthogConfig, WmPosthogInitOptions, WmPosthogProps} from '@wm-types/posthog';
import {PosthogAdapter} from './posthog.adapter';

@Injectable()
export class PosthogCapacitorClient implements WmPosthogClient {
  private initialized = false;
  private sessionRecordingStarted = false;
  private recordingEnabled = false;
  private recordingProbability = 0;

  constructor(
    @Inject(POSTHOG_CONFIG) private config: WmPosthogConfig,
    private posthogAdapter: PosthogAdapter,
  ) {}

  /**
   * Indica se siamo su piattaforma nativa (iOS/Android app)
   */
  private get isNativePlatform(): boolean {
    return this.posthogAdapter.isNativePlatform;
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
      await this.posthogAdapter.capture({event, properties: props});
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

    await this.posthogAdapter.identify({distinctId, userProperties: props});
  }

  /**
   * Inizializza PostHog e registra le proprietà super.
   * Questo è l'unico punto di ingresso per l'inizializzazione.
   */
  async initAndRegister(props: WmPosthogProps, options?: WmPosthogInitOptions): Promise<void> {
    if (options?.enabled !== undefined) {
      this.config.enabled = options.enabled;
    }
    if (options?.recordingEnabled !== undefined) {
      this.recordingEnabled = options.recordingEnabled;
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
        await this.posthogAdapter.stopSessionRecording();
      } catch (error) {
        console.error('[PostHog] Failed to stop session recording:', error);
      }
    }

    await this.posthogAdapter.reset();
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
      // Determina se abilitare il session recording
      const shouldEnableRecording =
        this.recordingEnabled &&
        this.recordingProbability > 0 &&
        (this.recordingProbability >= 1 || Math.random() <= this.recordingProbability);

      console.log(`[PostHog] Session recording: ${shouldEnableRecording ? 'enabled' : 'disabled'}`);

      this.sessionRecordingStarted = shouldEnableRecording;

      const options: SetupOptions = {
        apiKey: this.config.apiKey,
        host: this.config.host,
        enableSessionReplay: shouldEnableRecording,
      };

      // Aggiungi sessionReplayConfig solo se il recording è abilitato
      if (shouldEnableRecording) {
        options.sessionReplayConfig = {
          screenshotMode: true,
          maskAllTextInputs: false,
          maskAllImages: false,
          maskAllSandboxedViews: false,
          captureNetworkTelemetry: false,
          debouncerDelay: 1.0,
        };
      }

      await this.posthogAdapter.setup(options);
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
        await this.posthogAdapter.register({key, value: valueToSend});
      } catch (error) {
        console.error(`[PostHog] Failed to register '${key}':`, error);
      }
    }
  }
}
