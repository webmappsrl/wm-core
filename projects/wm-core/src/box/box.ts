import {ChangeDetectorRef, Directive, EventEmitter, Input, Output} from '@angular/core';
import {Store} from '@ngrx/store';
import {LangService} from '@wm-core/localization/lang.service';

@Directive({
  standalone: false,
  selector: 'basebox',
})
export class BaseBoxComponent<T> {
  @Input() data: T;
  @Output() public clickEVT: EventEmitter<void | number | string> = new EventEmitter<
    void | number | string
  >();

  public defaultPhotoPath = '/assets/icon/no-photo.svg';

  constructor(
    protected _langSvc: LangService,
    protected _cdr: ChangeDetectorRef,
    protected _store: Store,
  ) {
    this._langSvc.onLangChange.subscribe(() => {
      this._cdr.markForCheck();
    });
  }
}
