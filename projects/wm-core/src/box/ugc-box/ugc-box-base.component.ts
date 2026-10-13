import {Directive} from '@angular/core';
import {combineLatest, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {Capacitor} from '@capacitor/core';
import {BaseBoxComponent} from '../box';
import {IUGCBOX} from '../../types/config';
import {openUgcUploader} from '@wm-core/store/user-activity/user-activity.action';
import {ugcOpened} from '@wm-core/store/user-activity/user-activity.selector';
import {isLogged, needsPrivacyAgree} from '@wm-core/store/auth/auth.selectors';
import {confAPP} from '@wm-core/store/conf/conf.selector';

const LOCAL_MY_PATHS = 'assets/images/profile/my-path.webp';

/**
 * Logica di `wm-ugc-box`, condivisa fra il default e la variante camminiditalia (oc:8764). Ogni
 * sottoclasse dichiara `selector`, `templateUrl` e `styleUrls`; le due usano lo stesso template, e la
 * variante spegne il bottone di import da file sovrascrivendo `showUgcUploaderButton$`.
 *
 * `@Directive()` astratta, come `BaseBoxComponent` che estende: genera la factory DI (`ɵfac`) da
 * cui le sottoclassi ereditano i parametri del costruttore; la guardia è in
 * `ugc-box-base.component.spec.ts`.
 */
@Directive()
export abstract class UgcBoxBaseComponent extends BaseBoxComponent<IUGCBOX> {
  myPathsImage$: Observable<string> = this._store.select(confAPP).pipe(
    map(app => (!Capacitor.isNativePlatform() && app?.myPaths) ? app.myPaths : LOCAL_MY_PATHS),
  );
  isLogged$: Observable<boolean> = this._store.select(isLogged);
  ugcOpen$: Observable<boolean> = this._store.select(ugcOpened);
  showUgcUploaderButton$: Observable<boolean> = combineLatest([this.isLogged$, this.ugcOpen$]).pipe(
    map(([isLogged, ugcOpen]) => isLogged && ugcOpen),
  );
  needsPrivacyAgree$: Observable<boolean> = this._store.select(needsPrivacyAgree);
  showPrivacyAgreeButton$: Observable<boolean> = combineLatest([this.ugcOpen$, this.needsPrivacyAgree$]).pipe(
    map(([ugcOpen, needsPrivacyAgree]) => ugcOpen && needsPrivacyAgree),
  );

  /** Apre l'uploader per importare una UGC da file GPX, KML o GeoJSON. */
  openUgcUploader(): void {
    this._store.dispatch(openUgcUploader());
  }
}
