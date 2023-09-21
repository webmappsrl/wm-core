import {Injectable} from '@angular/core';
import {LoadingController, LoadingOptions} from '@ionic/angular';
import {BehaviorSubject, from, Observable, of} from 'rxjs';
import {filter, mergeMap, switchMap, take, tap} from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class WmLoadingService {
  private _events$: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
  private _loading$: BehaviorSubject<HTMLIonLoadingElement | null> = new BehaviorSubject(null);

  constructor(private _loadingCtrl: LoadingController) {}

  close(event?: string): void {
    let events = this._events$.value;
    if (event == null) {
      events = [];
    } else {
      events = events.filter(e => e != event);
    }
    this._events$.next(events);
    if (this._events$.value.length === 0) {
      this.dismiss()
        .pipe(take(1))
        .subscribe(() => {
          this._loading$.next(null);
          this._events$.next([]);
        });
    } else {
      this.message(events[events.length - 1]);
    }
  }

  create(opts?: LoadingOptions): Observable<HTMLIonLoadingElement> {
    return from(this._loadingCtrl.create(opts));
  }

  dismiss(): Observable<boolean> {
    return this._loading$.pipe(
      filter(l => l != null),
      switchMap(loading => loading.dismiss()),
    );
  }

  message(message: string): Observable<HTMLIonLoadingElement> {
    const loading = this._loading$.value;
    if (loading != null && loading.message != message) {
      loading.message = message;
      console.log('loading message: ' + loading.message);
    }
    return this._loading$;
  }

  present(): Observable<void> {
    return this._loading$.pipe(switchMap(loading => from(loading.present())));
  }

  show(message: string): void {
    if (this._events$.value.includes(message) === false) {
      this._events$.next([...this._events$.value, message]);
      const loading = this._loading$.value;
      let obs: Observable<HTMLIonLoadingElement> = null;
      if (loading != null) {
        obs = this.message(message);
      } else {
        obs = this.create({message, duration: 10000});
      }
      obs
        .pipe(
          switchMap(loading => {
            this._loading$.next(loading);
            return loading.present();
          }),
          take(1),
        )
        .subscribe();
    }
  }
}
