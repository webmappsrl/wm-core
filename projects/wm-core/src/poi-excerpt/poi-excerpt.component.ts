import {Component, ChangeDetectionStrategy, Input} from '@angular/core';

@Component({
  selector: 'wm-poi-excerpt',
  templateUrl: './poi-excerpt.component.html',
  styleUrls: ['./poi-excerpt.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WmPoiExcerpt {
  @Input() excerpt: string;
}
