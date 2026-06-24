import {DestroyRef, Injectable, Injector} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {Store} from '@ngrx/store';
import {currentEcPoiId, currentEcTrack} from '@wm-core/store/features/ec/ec.selector';
import {currentUgcPoiId, currentUgcTrackId} from '@wm-core/store/features/ugc/ugc.selector';
import {currentEcLayer} from '@wm-core/store/user-activity/user-activity.selector';
import {WmPosthogClient, WmPosthogInitOptions, WmPosthogProps} from '@wm-types/posthog';
import {combineLatest} from 'rxjs';
import {PosthogCapacitorClient} from './posthog-capacitor.client';
import {GeolocationService} from './geolocation.service';

/**
 * Wrapper trasparente di PosthogCapacitorClient che arricchisce ogni capture()
 * con proprietà di contesto standard (posizione GPS, layer/track/POI selezionati).
 *
 * Viene fornito come POSTHOG_CLIENT in wm-core.module.ts al posto del client diretto.
 * GeolocationService è iniettato in modo lazy via Injector per evitare circolarità.
 * Non usare providedIn: 'root' — richiede PosthogCapacitorClient fornito da WmCoreModule.forRoot().
 */
@Injectable()
export class PosthogContextService implements WmPosthogClient {
  private _contextSnapshot: WmPosthogProps = {};
  private _geolocationSvcRef: GeolocationService | null = null;

  constructor(
    private _client: PosthogCapacitorClient,
    private _store: Store,
    private _injector: Injector,
    private _destroyRef: DestroyRef,
  ) {
    combineLatest([
      this._store.select(currentEcLayer),
      this._store.select(currentEcPoiId),
      this._store.select(currentUgcPoiId),
      this._store.select(currentEcTrack),
      this._store.select(currentUgcTrackId),
    ])
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe(([layer, ecPoiId, ugcPoiId, ecTrack, ugcTrackId]) => {
        const snap: WmPosthogProps = {};
        if (layer?.id != null) snap['layer_id'] = `${layer.id}`;
        if (ecPoiId != null && ecPoiId !== 0) snap['poi_id'] = `${ecPoiId}`;
        if (ugcPoiId != null) snap['ugc_poi_id'] = `${ugcPoiId}`;
        if (ecTrack?.properties?.id != null) snap['track_id'] = `${ecTrack.properties.id}`;
        if (ugcTrackId != null) snap['ugc_track_id'] = `${ugcTrackId}`;
        this._contextSnapshot = snap;
      });

    this._initLocationTracking();
  }

  private get _geolocationSvc(): GeolocationService | null {
    if (!this._geolocationSvcRef) {
      this._geolocationSvcRef = this._injector.get(GeolocationService, null);
    }
    return this._geolocationSvcRef;
  }

  private _initLocationTracking(): void {
    // Defer past the constructor to break the circular dependency:
    // GeolocationService injects POSTHOG_CLIENT (@Optional), so resolving it
    // synchronously here would trigger NG0200.
    Promise.resolve().then(() => {
      this._geolocationSvc?.onLocationChange$
        .pipe(takeUntilDestroyed(this._destroyRef))
        .subscribe(() => {
          this.capture('userMoved', {mode: this._geolocationSvc?.currentMode});
        });
    });
  }

  private _buildContext(): WmPosthogProps {
    const ctx = {...this._contextSnapshot};
    const loc = this._geolocationSvc?.location;
    if (loc && Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude)) {
      ctx['user_location'] = loc;
    }
    return ctx;
  }

  /** Le props evento-specifiche sovrascrivono quelle di contesto. */
  capture(event: string, props: WmPosthogProps = {}): Promise<void> {
    return this._client.capture(event, {...this._buildContext(), ...props});
  }

  identify(distinctId: string, props?: WmPosthogProps): Promise<void> {
    return this._client.identify(distinctId, props);
  }

  initAndRegister(props: WmPosthogProps, options?: WmPosthogInitOptions): Promise<void> {
    return this._client.initAndRegister(props, options);
  }

  reset(): Promise<void> {
    return this._client.reset();
  }
}
