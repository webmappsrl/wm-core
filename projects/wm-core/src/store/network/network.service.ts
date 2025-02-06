import {Injectable} from '@angular/core';
import {from, Observable, timer} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';
import {Network} from '@capacitor/network';
@Injectable({
  providedIn: 'root',
})
export class NetworkService {
  online$: Observable<boolean>;

  constructor() {
    this.online$ = timer(1000, 2000).pipe(
      switchMap(() => from(Network.getStatus())),
      map(status => status.connected),
    );
  }
}
