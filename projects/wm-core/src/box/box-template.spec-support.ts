import {Pipe, PipeTransform} from '@angular/core';

/**
 * Pipe finte per i test sul template delle varianti camminiditalia delle card (oc:8701): stessi
 * nomi delle vere, senza le loro dipendenze (traduzioni, configurazione).
 */
@Pipe({standalone: false, name: 'wmtrans'})
export class FakeWmTransPipe implements PipeTransform {
  /**
   * Restituisce la chiave con i parametri sostituiti, senza tradurre.
   *
   * @param value Chiave italiana.
   * @param params Parametri da interpolare.
   * @returns Il testo interpolato.
   */
  transform(value: unknown, params?: Record<string, unknown>): string {
    let text = `${value ?? ''}`;
    Object.entries(params ?? {}).forEach(([k, v]) => (text = text.replace(`{{${k}}}`, `${v}`)));
    return text;
  }
}

@Pipe({standalone: false, name: 'hasLogo'})
export class FakeHasLogoPipe implements PipeTransform {
  /**
   * @param value Url del logo.
   * @returns `true` se c'è un logo.
   */
  transform(value: unknown): boolean {
    return !!value;
  }
}

@Pipe({standalone: false, name: 'distance'})
export class FakeDistancePipe implements PipeTransform {
  /**
   * @param value Distanza.
   * @returns La distanza invariata.
   */
  transform(value: unknown): unknown {
    return value;
  }
}

@Pipe({standalone: false, name: 'wmToMb'})
export class FakeToMbPipe implements PipeTransform {
  /**
   * @param value Dimensione.
   * @returns La dimensione invariata.
   */
  transform(value: unknown): unknown {
    return value;
  }
}

/** Le pipe finte da dichiarare nel modulo di test. */
export const FAKE_BOX_PIPES = [FakeWmTransPipe, FakeHasLogoPipe, FakeDistancePipe, FakeToMbPipe];
