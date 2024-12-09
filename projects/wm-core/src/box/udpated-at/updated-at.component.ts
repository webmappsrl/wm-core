import { ChangeDetectionStrategy, Component, Input, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'wm-updated-at',
  templateUrl: './updated-at.component.html',
  styleUrls: ['./updated-at.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class UpdatedAtComponent {
  @Input() updatedAt: Date;
}
