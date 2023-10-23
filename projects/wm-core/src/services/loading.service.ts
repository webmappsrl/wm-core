import {EventEmitter, Injectable} from '@angular/core';
import {LoadingController, LoadingOptions} from '@ionic/angular';
import {BehaviorSubject, from, Observable, of} from 'rxjs';
import {debounceTime, filter, mergeMap, switchMap, take, tap} from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class WmLoadingService {
  private _addMsgEvt$: EventEmitter<string> = new EventEmitter<string>();
  private _events$: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
  private _loading$: BehaviorSubject<HTMLIonLoadingElement | null> = new BehaviorSubject(null);
  private _present$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private _removeMsgEvt$: EventEmitter<string> = new EventEmitter<string>();

  constructor(private _loadingCtrl: LoadingController) {
    this._addMsgEvt$.subscribe(addMsg => {
      this._events$.next([...this._events$.value, addMsg]);
      if (this._events$.value.length === 1) {
        this.create({message: addMsg})
          .pipe(
            take(1),
            switchMap(loading => loading.present()),
          )
          .subscribe(() => this._present$.next(true));
      }
    });
    this._removeMsgEvt$.subscribe(removeMsg => {
      this._present$.pipe(filter(f => f)).subscribe(() => {
        this._events$.next(this._events$.value.filter(e => e != removeMsg));
        if (this._events$.value.length === 0) {
          from(this._loadingCtrl.getTop())
            .pipe(
              take(1),
              switchMap(loading => loading.dismiss()),
            )
            .subscribe(() => this._present$.next(false));
        } else {
          from(this._loadingCtrl.getTop())
            .pipe(take(1))
            .subscribe(loading => {
              if (loading.message === removeMsg) {
                loading.message = this._events$.value[0];
              }
            });
        }
      });
    });
  }

  close(event?: string): void {
    this._removeMsgEvt$.next(event);
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
    }
    return this._loading$;
  }

  present(): Observable<void> {
    return this._loading$.pipe(switchMap(loading => from(loading.present())));
  }

  show(message: string): void {
    this._addMsgEvt$.next(message);
  }
}
