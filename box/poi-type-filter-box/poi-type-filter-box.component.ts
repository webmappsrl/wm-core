import {Component, OnInit, ViewEncapsulation} from '@angular/core';

import {BaseBoxComponent as BBaseBoxComponent} from '../box';
import {IPOITYPEFILTERBOX} from '../../types/config';
import {BehaviorSubject} from 'rxjs';

@Component({
  selector: 'wm-poi-type-filter-box',
  templateUrl: './poi-type-filter-box.component.html',
  styleUrls: ['./poi-type-filter-box.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class PoiTypeFilterBoxComponent
  extends BBaseBoxComponent<IPOITYPEFILTERBOX>
  implements OnInit
{
  backgroundColor$: BehaviorSubject<string> = new BehaviorSubject<string | null>('white');
  color$: BehaviorSubject<string> = new BehaviorSubject<string | null>('white');
  toggle() {
    const color = this.color$.value;
    const backgroundColor = this.backgroundColor$.value;
    this.color$.next(backgroundColor);
    this.backgroundColor$.next(color);
    this.clickEVT.emit();
  }
  ngOnInit(): void {
    this.backgroundColor$.next(this.data.color);
  }
}
