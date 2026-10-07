import {ApplicationRef, ChangeDetectorRef, OnDestroy, Pipe, PipeTransform} from '@angular/core';
import {LangService} from '../localization/lang.service';
import {Subscription} from 'rxjs';
import {wmTranslate} from './wmtrans.utils';

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
    return wmTranslate(value, this.langSvc, ...args);
  }
}
