import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output, ViewEncapsulation} from '@angular/core';

@Component({
  selector: 'wm-modal-header',
  templateUrl: './modal-header.component.html',
  styleUrls: ['./modal-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
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
