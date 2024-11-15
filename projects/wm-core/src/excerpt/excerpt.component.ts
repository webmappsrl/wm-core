import {Component, ChangeDetectionStrategy, Input} from '@angular/core';

@Component({
  selector: 'wm-excerpt',
  templateUrl: './excerpt.component.html',
  styleUrls: ['./excerpt.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WmExcerpt {
  @Input() excerpt: string;
}
