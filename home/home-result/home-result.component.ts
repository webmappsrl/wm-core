import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  ViewEncapsulation,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import {BehaviorSubject} from 'rxjs';

@Component({
  selector: 'wm-home-result',
  templateUrl: './home-result.component.html',
  styleUrls: ['./home-result.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmHomeResultComponent implements OnChanges {
  @Input() loadingTracks: boolean;
  @Input() pois: any[];
  @Input() tracks: IHIT[];
  @Output() poiEVT: EventEmitter<any> = new EventEmitter();
  @Output() trackEVT: EventEmitter<number> = new EventEmitter();

  showResultType$: BehaviorSubject<string> = new BehaviorSubject<string>('tracks');

  changeResultType(event): void {
    this.showResultType$.next(event.target.value);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.pois != null && changes.pois.currentValue != null) {
      this.showResultType$.next('pois');
    }
  }
}
