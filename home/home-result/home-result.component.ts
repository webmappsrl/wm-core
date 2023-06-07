import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  ViewEncapsulation,
  EventEmitter,
} from '@angular/core';
import {BehaviorSubject} from 'rxjs';

@Component({
  selector: 'wm-home-result',
  templateUrl: './home-result.component.html',
  styleUrls: ['./home-result.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmHomeResultComponent {
  showResultType$: BehaviorSubject<string> = new BehaviorSubject<string>('pois');
  @Input() tracks: IHIT[];
  @Input() loadingTracks: boolean;
  @Input() pois: any[];
  @Output() trackEVT: EventEmitter<number> = new EventEmitter();
  @Output() poiEVT: EventEmitter<any> = new EventEmitter();
  changeResultType(event): void {
    this.showResultType$.next(event.target.value);
  }
}
