import {ChangeDetectionStrategy, Component, ViewEncapsulation} from "@angular/core";
import {Store} from "@ngrx/store";
import {confOPTIONS} from "@wm-core/store/conf/conf.selector";
import {currentEcTrackProperties} from "@wm-core/store/features/ec/ec.selector";
import {IOPTIONS} from "@wm-core/types/config";
import {BehaviorSubject, Observable} from "rxjs";
import {tap} from "rxjs/operators";

@Component({
  selector: 'wm-travel-mode',
  templateUrl: './travel-mode.component.html',
  styleUrls: ['./travel-mode.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class TravelModeComponent {
  private _originalDuration: number;

  confOPTIONS$: Observable<IOPTIONS> = this._store.select(confOPTIONS);
  durention$: BehaviorSubject<number> = new BehaviorSubject(null);
  ecTrackProperties$ = this._store.select(currentEcTrackProperties).pipe(
    tap((ecTrackProperties) => {
      this._originalDuration = ecTrackProperties?.duration_forward ?? 0;
      this.durention$.next(this._originalDuration);
    })
  );

  constructor(private _store: Store) {}

  onTravelModeChange(event: any) {
    const mode = event?.detail?.value;
    if (mode === 'bike') {
        this.durention$.next(this._originalDuration * 0.33);
    } else {
      this.durention$.next(this._originalDuration);
    }
  }
}
