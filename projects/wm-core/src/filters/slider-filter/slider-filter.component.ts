import {Component, Host, Inject, Input, OnDestroy, Optional, ViewEncapsulation} from '@angular/core';
import {RangeCustomEvent} from '@ionic/angular';
import {merge, Subscription} from 'rxjs';
import {FiltersComponent} from '../filters.component';
import {Filter, SliderFilter} from '../../types/config';
import {POSTHOG_CLIENT} from '../../store/conf/conf.token';
import {WmPosthogClient} from '@wm-types/posthog';
export declare type RangeValue =
  | number
  | {
      lower: number;
      upper: number;
    };
@Component({
  standalone: false,
  selector: 'wm-slider-filter',
  templateUrl: './slider-filter.component.html',
  styleUrls: ['./slider-filter.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class SliderFilterComponent implements OnDestroy {
  @Input() filter: SliderFilter;
  @Input() filterName: any;

  currentValue: SliderFilter|null = null;
  resetFilterSub: Subscription = Subscription.EMPTY;
//@ts-ignore
  constructor(
    @Host() public parent: FiltersComponent,
    @Optional() @Inject(POSTHOG_CLIENT) private _posthogClient?: WmPosthogClient,
  ) {
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
    const value = (ev as RangeCustomEvent).detail.value as RangeValue;
    this.currentValue =
      typeof value === 'number'
        ? {...this.filter, min: value}
        : {...this.filter, ...value};

    this._posthogClient?.capture('filterUsed', {
      filter_type: 'tracks',
      filter_id: `${this.filter?.identifier ?? ''}`,
      filter_name: this.filter?.taxonomy ?? '',
      slider_value: typeof value === 'number' ? `${value}` : `${value.lower}-${value.upper}`,
    });

    this.parent.lastFilterTypeEvt.emit('tracks');

    if (typeof value === 'number') {
      this.parent.filterTracksEvt.emit({...this.filter, ...{min: value}});
    } else {
      this.parent.filterTracksEvt.emit({
        ...this.filter,
        ...{lower: value.lower, upper: value.upper},
      });
    }
  }

  ngOnDestroy(): void {
    this.resetFilterSub.unsubscribe();
  }
}
