import {Directive, EventEmitter, Input, Output} from '@angular/core';

@Directive()
export class BaseBoxComponent<T> {
  @Input() data: T;
  @Output() public clickEVT: EventEmitter<void> = new EventEmitter<void>();
  public defaultPhotoPath = '/assets/icon/no-photo.svg';
}
