import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'webmapp-modal-header',
  templateUrl: './modal-header.component.html',
  styleUrls: ['./modal-header.component.scss'],
})
export class ModalHeaderComponent implements OnInit {
  @Input('title') title: string;
  @Output('dismiss') dismiss: EventEmitter<MouseEvent>;

  constructor() {
    this.dismiss = new EventEmitter<MouseEvent>();
  }

  ngOnInit() {}

  emitDismiss(event: MouseEvent) {
    this.dismiss.emit(event);
  }
}
