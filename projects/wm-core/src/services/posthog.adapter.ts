import {Injectable} from '@angular/core';
import {
  Posthog,
  SetupOptions,
  CaptureOptions,
  IdentifyOptions,
  RegisterOptions,
} from '@capawesome/capacitor-posthog';
import posthog from 'posthog-js';
import {DeviceService} from './device.service';

/**
 * Adapter per il modulo Posthog di Capacitor.
 *
 * Questo adapter wrappa le chiamate al modulo Posthog permettendo:
 * - Dependency Injection in Angular
 * - Facile mocking nei test
 * - Astrazione del modulo sottostante
 */
@Injectable({
  providedIn: 'root',
})
export class PosthogAdapter {
  constructor(private deviceService: DeviceService) {}

  /**
   * Inizializza PostHog con le opzioni fornite.
   * Sul web, gestisce direttamente posthog-js per rispettare enableSessionReplay.
   */
  setup(options: SetupOptions): Promise<void> {
    if (this.deviceService.isAppMobile) {
      return Posthog.setup(options);
    }

    // Web: usa posthog-js direttamente per avere controllo completo
    return new Promise((resolve) => {
      const host = options.host || 'https://us.i.posthog.com';
      const config: Record<string, unknown> = {
        api_host: host,
      };

      if (options.enableSessionReplay) {
        // Configura il session recording se abilitato
        config.session_recording = {
          recordCrossOriginIframes: true,
        };
        if (options.sessionReplayConfig?.maskAllTextInputs !== undefined) {
          (config.session_recording as Record<string, unknown>).maskAllInputs =
            options.sessionReplayConfig.maskAllTextInputs;
        }
      } else {
        // Disabilita esplicitamente il session recording
        // (posthog-js altrimenti usa le impostazioni del progetto PostHog)
        config.disable_session_recording = true;
      }

      posthog.init(options.apiKey, config);
      resolve();
    });
  }

  /**
   * Cattura un evento
   */
  capture(options: CaptureOptions): Promise<void> {
    return Posthog.capture(options);
  }

  /**
   * Identifica un utente
   */
  identify(options: IdentifyOptions): Promise<void> {
    return Posthog.identify(options);
  }

  /**
   * Registra una proprietà super (persistente)
   */
  register(options: RegisterOptions): Promise<void> {
    return Posthog.register(options);
  }

  /**
   * Resetta lo stato di PostHog (logout)
   */
  reset(): Promise<void> {
    return Posthog.reset();
  }

  /**
   * Avvia il session recording
   */
  startSessionRecording(): Promise<void> {
    return Posthog.startSessionRecording();
  }

  /**
   * Ferma il session recording
   */
  stopSessionRecording(): Promise<void> {
    return Posthog.stopSessionRecording();
  }

  /**
   * Indica se siamo su piattaforma nativa (iOS/Android app)
   */
  get isNativePlatform(): boolean {
    return this.deviceService.isAppMobile;
  }
}
