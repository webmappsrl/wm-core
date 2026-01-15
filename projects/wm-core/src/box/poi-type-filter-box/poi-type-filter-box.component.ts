import {Component, OnInit, ViewEncapsulation} from '@angular/core';

import {BaseBoxComponent as BBaseBoxComponent} from '../box';
import {BehaviorSubject} from 'rxjs';
import {IPOITYPEFILTERBOX} from '../../types/config';

@Component({
  standalone: false,
  selector: 'wm-poi-type-filter-box',
  templateUrl: './poi-type-filter-box.component.html',
  styleUrls: ['./poi-type-filter-box.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class PoiTypeFilterBoxComponent
  extends BBaseBoxComponent<IPOITYPEFILTERBOX>
  implements OnInit
{
  backgroundColor$: BehaviorSubject<string | null> = new BehaviorSubject<string | null>('white');
  color$: BehaviorSubject<string | null> = new BehaviorSubject<string | null>('white');

  ngOnInit(): void {
    this.backgroundColor$.next(this.data.color);
  }

  toggle() {
    const color = this.color$.value;
    const backgroundColor = this.backgroundColor$.value;
    this.color$.next(backgroundColor);
    this.backgroundColor$.next(color);
    this.clickEVT.emit();
  }
}
