import {ApplicationRef, ChangeDetectorRef, OnDestroy, Pipe, PipeTransform} from '@angular/core';
import {LangService} from '../localization/lang.service';
import {Subscription} from 'rxjs';

@Pipe({
  name: 'wmtrans',
  pure: false, // deve restare impuro
  standalone: false,
})
export class WmTransPipe implements PipeTransform, OnDestroy {
  private static sub: Subscription | null = null;
  private static readonly cdrs = new Set<ChangeDetectorRef>();

  constructor(private langSvc: LangService, private cdr: ChangeDetectorRef) {
    WmTransPipe.cdrs.add(this.cdr);
    if (!WmTransPipe.sub) {
      WmTransPipe.sub = this.langSvc.onLangChange.subscribe(() => {
        WmTransPipe.cdrs.forEach(c => c.markForCheck());
      });
    }
  }

  ngOnDestroy(): void {
    WmTransPipe.cdrs.delete(this.cdr);
  }

  transform(value: any, ...args: unknown[]): string {
    const currentLang = this.langSvc.currentLang;
    const defaultLang = this.langSvc.defaultLang;

    if (value) {
      if (currentLang && value[currentLang]) return value[currentLang];
      if (defaultLang && value[defaultLang]) return value[defaultLang];

      if (typeof value === 'string' || typeof value === 'number') {
        return this.langSvc.instant(`${value}`, ...args);
      }

      for (const k in value) if (value[k]) return value[k];
    }
    return '';
  }
}
