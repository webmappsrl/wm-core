import {ChangeDetectorRef, Directive, EventEmitter, Input, Output} from '@angular/core';
import {LangService} from 'wm-core/localization/lang.service';

@Directive({selector: 'basebox'})
export class BaseBoxComponent<T> {
  @Input() data: T;
  @Output() public clickEVT: EventEmitter<void | number> = new EventEmitter<void | number>();

  public defaultPhotoPath = '/assets/icon/no-photo.svg';

  constructor(private _langSvc: LangService, private _cdr: ChangeDetectorRef) {
    this._langSvc.onLangChange.subscribe(() => {
      this._cdr.markForCheck();
    });
  }
}
