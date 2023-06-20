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
import {Store} from '@ngrx/store';
import {BehaviorSubject} from 'rxjs';
import {countPois, countTracks} from '../../store/api/api.selector';

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

  countTracks$ = this._store.select(countTracks);
  countPois$ = this._store.select(countPois);
  showResultType$: BehaviorSubject<string> = new BehaviorSubject<string>('tracks');

  constructor(private _store: Store) {}

  changeResultType(event): void {
    this.showResultType$.next(event.target.value);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.pois != null && changes.pois.currentValue != null) {
      this.showResultType$.next('pois');
    }
  }
}
