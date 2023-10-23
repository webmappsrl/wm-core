import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  ViewEncapsulation,
} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';

@Component({
  selector: 'wm-track-edges',
  templateUrl: './track-edges.component.html',
  styleUrls: ['./track-edges.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmTrackEdgesComponent implements OnDestroy, OnChanges {
  @Input() conf: {[property: string]: any};
  @Input() properties: {[property: string]: any};

  edges: null | {prev: number[]; next: number[]} = null;
  nextColors = ['#FFF500', '#FFA13D', '#2DFE54', '#3F8DFF'];
  prevColors = ['#B0B0B0', '#8DAFD3', '#88C5A7', '#E9B1C2'];

  constructor(private _router: Router, private _route: ActivatedRoute) {}

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

  ngOnDestroy(): void {}

  goToTrack(trackID: number): void {
    this._router.navigate([], {
      relativeTo: this._route,
      queryParams: {track: trackID ? trackID : null},
      queryParamsHandling: 'merge',
    });
  }
}
