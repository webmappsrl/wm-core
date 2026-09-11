import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  standalone: false,
  name: 'userInitials',
  pure: true,
})
export class WmUserInitialsPipe implements PipeTransform {
  /**
   * Restituisce la sola iniziale (maiuscola) del nome fornito, o stringa vuota
   * se il nome è assente/vuoto — mai un placeholder generico (es. "?").
   */
  transform(name: string | null | undefined): string {
    const trimmed = (name ?? '').trim();
    if (trimmed.length === 0) {
      return '';
    }
    return trimmed.charAt(0).toUpperCase();
  }
}
