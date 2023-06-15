import {Component, Host, Input, OnDestroy, ViewEncapsulation} from '@angular/core';
import {RangeCustomEvent} from '@ionic/angular';
import {merge, Subscription} from 'rxjs';
import {FiltersComponent} from '../filters.component';
export declare type RangeValue =
  | number
  | {
      lower: number;
      upper: number;
    };
@Component({
  selector: 'wm-slider-filter',
  templateUrl: './slider-filter.component.html',
  styleUrls: ['./slider-filter.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class SliderFilterComponent implements OnDestroy {
  @Input() filter: SliderFilter;
  @Input() filterName: any;

  currentValue: RangeValue = null;
  resetFilterSub: Subscription = Subscription.EMPTY;

  constructor(@Host() public parent: FiltersComponent) {
    this.resetFilterSub = merge(
      this.parent.resetFiltersEvt,
      this.parent.removefilterTracksEvt,
    ).subscribe(filter => {
      if (
        filter == null ||
        (filter != null && (filter as Filter).identifier === this.filter.identifier)
      ) {
        this.currentValue = null;
      }
    });
  }

  onIonChange(ev: Event): void {
    this.currentValue = (ev as RangeCustomEvent).detail.value as RangeValue;
    if (typeof this.currentValue === 'number') {
      this.parent.filterTracksEvt.emit({...this.filter, ...{min: this.currentValue}});
    } else {
      this.parent.filterTracksEvt.emit({
        ...this.filter,
        ...{lower: this.currentValue.lower, upper: this.currentValue.upper},
      });
    }
  }

  ngOnDestroy(): void {
    this.resetFilterSub.unsubscribe();
  }
}
