import {Component, Input} from '@angular/core';
import {Store} from '@ngrx/store';
import {icons} from '@wm-core/store/icons/icons.selector';
import {ICONS} from '@wm-types/config';
import {Observable} from 'rxjs';

@Component({
  selector: 'wm-icon',
  standalone: false,
  template: `
  <ng-container *ngIf="icons$ | async as icons; else legacyIcon">
    <div
      appBuildSvg
      *ngIf="icons?.[iconData?.icon_name] as icon; else legacyIcon"
      [svg]="icon"
      [color]="useColor ? iconData?.color : null"
    ></div>
  </ng-container>
    <ng-template #legacyIcon>
      <div appBuildSvg *ngIf="iconData?.icon != null" [svg]="iconData.icon" [color]="useColor ? iconData?.color : null"></div>
    </ng-template>
  `,
  styles: [],
})
export class WmIconComponent {
  @Input() iconData: any;
  @Input() useColor: boolean = true;

  icons$: Observable<ICONS> = this._store.select(icons);

  constructor(private _store: Store) {}
}
