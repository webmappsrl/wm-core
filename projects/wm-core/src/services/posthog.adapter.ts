import {Injectable} from '@angular/core';
import {Capacitor} from '@capacitor/core';
import {
  Posthog,
  SetupOptions,
  CaptureOptions,
  IdentifyOptions,
  RegisterOptions,
} from '@capawesome/capacitor-posthog';

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
  /**
   * Inizializza PostHog con le opzioni fornite
   */
  setup(options: SetupOptions): Promise<void> {
    return Posthog.setup(options);
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
   * Restituisce la piattaforma corrente (ios, android, web)
   */
  getPlatform(): string {
    return Capacitor.getPlatform();
  }
}
