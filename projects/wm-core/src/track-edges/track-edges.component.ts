import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  ViewEncapsulation,
} from '@angular/core';
import {UrlHandlerService} from '@wm-core/services/url-handler.service';

@Component({
  standalone: false,
  selector: 'wm-track-edges',
  templateUrl: './track-edges.component.html',
  styleUrls: ['./track-edges.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmTrackEdgesComponent implements OnChanges {
  @Input() conf: {[property: string]: any};
  @Input() properties: {[property: string]: any};

  edges: null | {prev: number[]; next: number[]} = null;
  nextColors = [
    '#FFF500',
    '#FFA13D',
    '#2DFE54',
    '#3F8DFF',
    '#FFD700',
    '#FF8A00',
    '#1DE43F',
    '#0066FF',
  ];
  prevColors = [
    '#B0B0B0',
    '#8DAFD3',
    '#88C5A7',
    '#E9B1C2',
    '#A0A0A0',
    '#7D9DC3',
    '#78B597',
    '#D9A1B2',
  ];

  constructor(private _urlHandlerSvc: UrlHandlerService) {}

  ngOnChanges(): void {
    if (
      this.properties != null &&
      this.properties.id != null &&
      this.conf != null &&
      this.conf.edges != null &&
      this.conf.edges[this.properties.id] != null
    ) {
      this.edges = this.conf.edges[this.properties.id];
    }
  }

  goToTrack(trackID: number): void {
    this._urlHandlerSvc.updateURL({track: trackID});
  }
}
