import {Directive, EventEmitter, Input, Output} from '@angular/core';

@Directive({selector: 'basebox'})
export class BaseBoxComponent<T> {
  @Input() data: T;
  @Output() public clickEVT: EventEmitter<void | number> = new EventEmitter<void | number>();

  public defaultPhotoPath = '/assets/icon/no-photo.svg';
}
