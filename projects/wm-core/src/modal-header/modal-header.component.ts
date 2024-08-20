import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'wm-modal-header',
  templateUrl: './modal-header.component.html',
  styleUrls: ['./modal-header.component.scss'],
})
export class ModalHeaderComponent {
  @Input('title') title: string;
  @Output('dismiss') dismiss: EventEmitter<MouseEvent>;

  constructor() {
    this.dismiss = new EventEmitter<MouseEvent>();
  }

  emitDismiss(event: MouseEvent): void {
    this.dismiss.emit(event);
  }
}
