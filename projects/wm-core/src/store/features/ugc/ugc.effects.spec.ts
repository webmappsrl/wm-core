import {TestBed} from '@angular/core/testing';
import {provideMockActions} from '@ngrx/effects/testing';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {Observable, of, throwError} from 'rxjs';
import {AlertController} from '@ionic/angular';
import {Action} from '@ngrx/store';

import {UgcEffects} from './ugc.effects';
import {UgcService} from './ugc.service';
import {LangService} from '@wm-core/localization/lang.service';
import {
  deleteUgcPoi,
  deleteUgcPoiFailure,
  deleteUgcPoiSuccess,
  deleteUgcTrack,
  deleteUgcTrackFailure,
  deleteUgcTrackSuccess,
  deleteUgcMedia,
  deleteUgcMediaFailure,
  deleteUgcMediaSuccess,
  enableSyncInterval,
  syncUgc,
  syncUgcPois,
  syncUgcTracks,
  updateUgcPoi,
  updateUgcPoiFailure,
  updateUgcPoiSuccess,
  updateUgcTrack,
  updateUgcTrackFailure,
  updateUgcTrackSuccess,
} from './ugc.actions';
import {
  activableUgc,
  syncUgcIntervalEnabled,
  currentUgcPoiDrawnGeometry,
  currentUgcPoi,
} from './ugc.selector';
import {WmFeature} from '@wm-types/feature';
import {Point, LineString} from 'geojson';

// Note: of(disableSyncInterval()).pipe(mergeMap(() => INNER)) does NOT dispatch
// disableSyncInterval — mergeMap replaces each upstream value with INNER's output.
// Effects emit only the inner success/failure actions.

const makePoi = (props: any = {}): WmFeature<Point> => ({
  type: 'Feature',
  geometry: {type: 'Point', coordinates: [11, 45]},
  properties: {name: 'Test POI', ...props},
});

const makeTrack = (props: any = {}): WmFeature<LineString> => ({
  type: 'Feature',
  geometry: {type: 'LineString', coordinates: [[11, 45], [12, 46]]},
  properties: {name: 'Test Track', ...props},
});

const makeAlertMock = (role = 'cancel') => ({
  present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
  onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(Promise.resolve({role})),
});

const collectActions = (
  effect$: Observable<Action>,
  expectedCount: number,
  done: DoneFn,
  assert: (actions: Action[]) => void,
) => {
  const dispatched: Action[] = [];
  effect$.subscribe(action => {
    dispatched.push(action);
    if (dispatched.length === expectedCount) {
      assert(dispatched);
      done();
    }
  });
};

describe('UgcEffects', () => {
  let actions$: Observable<Action>;
  let effects: UgcEffects;
  let store: MockStore;
  let ugcServiceSpy: jasmine.SpyObj<UgcService>;
  let alertCtrlSpy: jasmine.SpyObj<AlertController>;
  let langSvcSpy: jasmine.SpyObj<LangService>;

  beforeEach(() => {
    ugcServiceSpy = jasmine.createSpyObj('UgcService', [
      'deleteApiPoi',
      'deleteTrack',
      'updateApiPoi',
      'updateApiTrack',
      'deleteApiMedia',
      'syncUgc',
      'loadUgcPois',
      'loadUgcTracks',
    ]);
    alertCtrlSpy = jasmine.createSpyObj('AlertController', ['create']);
    langSvcSpy = jasmine.createSpyObj('LangService', ['instant']);
    langSvcSpy.instant.and.callFake((key: string) => key);
    alertCtrlSpy.create.and.returnValue(Promise.resolve(makeAlertMock() as any));

    TestBed.configureTestingModule({
      providers: [
        UgcEffects,
        provideMockActions(() => actions$),
        provideMockStore({
          selectors: [
            {selector: activableUgc, value: true},
            {selector: syncUgcIntervalEnabled, value: true},
            {selector: currentUgcPoiDrawnGeometry, value: null},
            {selector: currentUgcPoi, value: null},
          ],
        }),
        {provide: UgcService, useValue: ugcServiceSpy},
        {provide: AlertController, useValue: alertCtrlSpy},
        {provide: LangService, useValue: langSvcSpy},
      ],
    });

    effects = TestBed.inject(UgcEffects);
    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    store.resetSelectors();
  });

  // ─── deleteUgcFailure$ ────────────────────────────────────────────────────

  describe('deleteUgcFailure$', () => {
    it('should show alert with error code in brackets when error is present', done => {
      alertCtrlSpy.create.and.returnValue(Promise.resolve(makeAlertMock() as any));
      actions$ = of(deleteUgcPoiFailure({error: '404'}));

      effects.deleteUgcFailure$.subscribe(() => {
        const args = alertCtrlSpy.create.calls.mostRecent().args[0];
        expect(args.message).toContain('[404]');
        expect(args.header).toBeTruthy();
        done();
      });
    });

    it('should show base message only when error is falsy', done => {
      alertCtrlSpy.create.and.returnValue(Promise.resolve(makeAlertMock() as any));
      actions$ = of(deleteUgcPoiFailure({error: null as any}));

      effects.deleteUgcFailure$.subscribe(() => {
        const args = alertCtrlSpy.create.calls.mostRecent().args[0];
        expect(args.message).not.toContain('[');
        done();
      });
    });
  });

  // ─── deleteUgcPoi$ ────────────────────────────────────────────────────────

  describe('deleteUgcPoi$', () => {
    it('should dispatch 3 success actions when deleteApiPoi succeeds', done => {
      const poi = makePoi({id: 1});
      ugcServiceSpy.deleteApiPoi.and.returnValue(of({}));

      actions$ = of(deleteUgcPoi({poi}));
      collectActions(effects.deleteUgcPoi$, 3, done, ([a, b, c]) => {
        expect(a).toEqual(deleteUgcPoiSuccess({poi}));
        expect(b).toEqual(syncUgcPois());
        expect(c).toEqual(enableSyncInterval());
      });
    });

    it('should dispatch success actions on 404 (treat as already deleted)', done => {
      const poi = makePoi({id: 5});
      ugcServiceSpy.deleteApiPoi.and.returnValue(throwError(() => ({status: 404})));

      actions$ = of(deleteUgcPoi({poi}));
      collectActions(effects.deleteUgcPoi$, 3, done, ([a, b, c]) => {
        expect(a).toEqual(deleteUgcPoiSuccess({poi}));
        expect(b).toEqual(syncUgcPois());
        expect(c).toEqual(enableSyncInterval());
      });
    });

    it('should dispatch failure + enableSyncInterval on non-404 API error', done => {
      const poi = makePoi({id: 2});
      ugcServiceSpy.deleteApiPoi.and.returnValue(throwError(() => ({status: 500})));

      actions$ = of(deleteUgcPoi({poi}));
      collectActions(effects.deleteUgcPoi$, 2, done, ([a, b]) => {
        expect(a).toEqual(deleteUgcTrackFailure({error: 500 as any}));
        expect(b).toEqual(enableSyncInterval());
      });
    });

    it('should dispatch success actions for device poi (no id, no API call)', done => {
      const poi = makePoi({uuid: 'local-uuid'});
      actions$ = of(deleteUgcPoi({poi}));

      collectActions(effects.deleteUgcPoi$, 3, done, ([a]) => {
        expect(a).toEqual(deleteUgcPoiSuccess({poi}));
        expect(ugcServiceSpy.deleteApiPoi).not.toHaveBeenCalled();
      });
    });

    it('should dispatch deleteUgcPoiFailure when poi is null', done => {
      actions$ = of(deleteUgcPoi({poi: null as any}));

      effects.deleteUgcPoi$.subscribe(action => {
        if (action.type === deleteUgcPoiFailure.type) {
          expect((action as any).error).toBe('Poi not found');
          done();
        }
      });
    });
  });

  // ─── deleteUgcTrack$ ─────────────────────────────────────────────────────

  describe('deleteUgcTrack$', () => {
    it('should dispatch 3 success actions when deleteTrack succeeds', done => {
      const track = makeTrack({id: 10});
      ugcServiceSpy.deleteTrack.and.returnValue(of({}));

      actions$ = of(deleteUgcTrack({track}));
      collectActions(effects.deleteUgcTrack$, 3, done, ([a, b, c]) => {
        expect(a).toEqual(deleteUgcTrackSuccess({track}));
        expect(b).toEqual(syncUgcTracks());
        expect(c).toEqual(enableSyncInterval());
      });
    });

    it('should dispatch success actions on 404 (treat as already deleted)', done => {
      const track = makeTrack({id: 10});
      ugcServiceSpy.deleteTrack.and.returnValue(throwError(() => ({status: 404})));

      actions$ = of(deleteUgcTrack({track}));
      collectActions(effects.deleteUgcTrack$, 3, done, ([a]) => {
        expect(a).toEqual(deleteUgcTrackSuccess({track}));
      });
    });

    it('should dispatch failure + enableSyncInterval on non-404 API error', done => {
      const track = makeTrack({id: 10});
      ugcServiceSpy.deleteTrack.and.returnValue(throwError(() => ({status: 500})));

      actions$ = of(deleteUgcTrack({track}));
      collectActions(effects.deleteUgcTrack$, 2, done, ([a, b]) => {
        expect(a).toEqual(deleteUgcTrackFailure({error: 500 as any}));
        expect(b).toEqual(enableSyncInterval());
      });
    });

    it('should dispatch success actions for device track (no id, no API call)', done => {
      const track = makeTrack({uuid: 'local-uuid'});
      actions$ = of(deleteUgcTrack({track}));

      collectActions(effects.deleteUgcTrack$, 3, done, ([a]) => {
        expect(a).toEqual(deleteUgcTrackSuccess({track}));
        expect(ugcServiceSpy.deleteTrack).not.toHaveBeenCalled();
      });
    });

    it('should dispatch deleteUgcTrackFailure when track is null', done => {
      actions$ = of(deleteUgcTrack({track: null as any}));

      effects.deleteUgcTrack$.subscribe(action => {
        if (action.type === deleteUgcTrackFailure.type) {
          expect((action as any).error).toBe('Track not found');
          done();
        }
      });
    });
  });

  // ─── updateUgcFailure$ ────────────────────────────────────────────────────

  describe('updateUgcFailure$', () => {
    it('should show alert with error code in brackets when error is present', done => {
      alertCtrlSpy.create.and.returnValue(Promise.resolve(makeAlertMock() as any));
      actions$ = of(updateUgcPoiFailure({error: '500'}));

      effects.updateUgcFailure$.subscribe(() => {
        const args = alertCtrlSpy.create.calls.mostRecent().args[0];
        expect(args.message).toContain('[500]');
        done();
      });
    });

    it('should show base message only when error is falsy', done => {
      alertCtrlSpy.create.and.returnValue(Promise.resolve(makeAlertMock() as any));
      actions$ = of(updateUgcTrackFailure({error: null as any}));

      effects.updateUgcFailure$.subscribe(() => {
        const args = alertCtrlSpy.create.calls.mostRecent().args[0];
        expect(args.message).not.toContain('[');
        done();
      });
    });
  });

  // ─── updateUgcPoi$ ────────────────────────────────────────────────────────

  describe('updateUgcPoi$', () => {
    it('should dispatch 3 success actions when updateApiPoi succeeds', done => {
      const poi = makePoi({id: 3});
      ugcServiceSpy.updateApiPoi.and.returnValue(Promise.resolve({}));

      actions$ = of(updateUgcPoi({poi}));
      collectActions(effects.updateUgcPoi$, 3, done, ([a, b, c]) => {
        expect(a).toEqual(updateUgcPoiSuccess({poi}));
        expect(b).toEqual(syncUgcPois());
        expect(c).toEqual(enableSyncInterval());
      });
    });

    it('should dispatch success actions on 404 (removeSynchronizedUgcPoi + fallback)', done => {
      const poi = makePoi({id: 3});
      // On 404, the effect calls removeSynchronizedUgcPoi (localforage) then dispatches success.
      // We can't spy on the localforage call, but we verify the dispatched actions.
      ugcServiceSpy.updateApiPoi.and.returnValue(Promise.reject({status: 404}));

      actions$ = of(updateUgcPoi({poi}));
      collectActions(effects.updateUgcPoi$, 3, done, ([a, b, c]) => {
        expect(a).toEqual(updateUgcPoiSuccess({poi}));
        expect(b).toEqual(syncUgcPois());
        expect(c).toEqual(enableSyncInterval());
      });
    });

    it('should dispatch failure + enableSyncInterval on non-404 API error', done => {
      const poi = makePoi({id: 3});
      ugcServiceSpy.updateApiPoi.and.returnValue(Promise.reject({status: 500}));

      actions$ = of(updateUgcPoi({poi}));
      collectActions(effects.updateUgcPoi$, 2, done, ([a, b]) => {
        expect(a).toEqual(updateUgcPoiFailure({error: 500 as any}));
        expect(b).toEqual(enableSyncInterval());
      });
    });

    it('should dispatch success actions for device poi (no id, no API call)', done => {
      const poi = makePoi({uuid: 'local-uuid'});
      actions$ = of(updateUgcPoi({poi}));

      collectActions(effects.updateUgcPoi$, 3, done, ([a]) => {
        expect(a).toEqual(updateUgcPoiSuccess({poi}));
        expect(ugcServiceSpy.updateApiPoi).not.toHaveBeenCalled();
      });
    });

    it('should dispatch updateUgcPoiFailure when poi is null', done => {
      actions$ = of(updateUgcPoi({poi: null as any}));

      effects.updateUgcPoi$.subscribe(action => {
        if (action.type === updateUgcPoiFailure.type) {
          expect((action as any).error).toBe('Poi not found');
          done();
        }
      });
    });
  });

  // ─── updateUgcTrack$ ─────────────────────────────────────────────────────

  describe('updateUgcTrack$', () => {
    it('should dispatch 3 success actions when updateApiTrack succeeds', done => {
      const track = makeTrack({id: 20});
      ugcServiceSpy.updateApiTrack.and.returnValue(Promise.resolve({}));

      actions$ = of(updateUgcTrack({track}));
      collectActions(effects.updateUgcTrack$, 3, done, ([a, b, c]) => {
        expect(a).toEqual(updateUgcTrackSuccess({track}));
        expect(b).toEqual(syncUgcTracks());
        expect(c).toEqual(enableSyncInterval());
      });
    });

    it('should dispatch success actions on 404 (removeSynchronizedUgcTrack + fallback)', done => {
      const track = makeTrack({id: 20});
      ugcServiceSpy.updateApiTrack.and.returnValue(Promise.reject({status: 404}));

      actions$ = of(updateUgcTrack({track}));
      collectActions(effects.updateUgcTrack$, 3, done, ([a, b, c]) => {
        expect(a).toEqual(updateUgcTrackSuccess({track}));
        expect(b).toEqual(syncUgcTracks());
        expect(c).toEqual(enableSyncInterval());
      });
    });

    it('should dispatch failure + enableSyncInterval on non-404 API error', done => {
      const track = makeTrack({id: 20});
      ugcServiceSpy.updateApiTrack.and.returnValue(Promise.reject({status: 500}));

      actions$ = of(updateUgcTrack({track}));
      collectActions(effects.updateUgcTrack$, 2, done, ([a, b]) => {
        expect(a).toEqual(updateUgcTrackFailure({error: 500 as any}));
        expect(b).toEqual(enableSyncInterval());
      });
    });

    it('should dispatch success actions for device track (no id, no API call)', done => {
      const track = makeTrack({uuid: 'local-uuid'});
      actions$ = of(updateUgcTrack({track}));

      collectActions(effects.updateUgcTrack$, 3, done, ([a]) => {
        expect(a).toEqual(updateUgcTrackSuccess({track}));
        expect(ugcServiceSpy.updateApiTrack).not.toHaveBeenCalled();
      });
    });

    it('should dispatch updateUgcTrackFailure when track is null', done => {
      actions$ = of(updateUgcTrack({track: null as any}));

      effects.updateUgcTrack$.subscribe(action => {
        if (action.type === updateUgcTrackFailure.type) {
          expect((action as any).error).toBe('Track not found');
          done();
        }
      });
    });
  });

  // ─── deleteUgcMedia$ ─────────────────────────────────────────────────────

  describe('deleteUgcMedia$', () => {
    const mockMedia = {id: 7, webPath: 'blob:http://localhost/m', format: 'jpeg', saved: false};
    const mockMediaNoId = {webPath: 'blob:http://localhost/m', format: 'jpeg', saved: false};

    it('should use error.status (not error.error.message) in deleteUgcMediaFailure', done => {
      alertCtrlSpy.create.and.returnValue(
        Promise.resolve(makeAlertMock('destructive') as any),
      );
      ugcServiceSpy.deleteApiMedia.and.returnValue(throwError(() => ({status: 403})));

      actions$ = of(deleteUgcMedia({media: mockMedia}));

      effects.deleteUgcMedia$.subscribe(action => {
        if (action.type === deleteUgcMediaFailure.type) {
          expect((action as any).error).toBe(403);
          done();
        }
      });
    });

    it('should dispatch deleteUgcMediaSuccess and syncUgc when deletion succeeds', done => {
      alertCtrlSpy.create.and.returnValue(
        Promise.resolve(makeAlertMock('destructive') as any),
      );
      ugcServiceSpy.deleteApiMedia.and.returnValue(of({}));

      actions$ = of(deleteUgcMedia({media: mockMedia}));
      collectActions(effects.deleteUgcMedia$, 2, done, ([a, b]) => {
        expect(a).toEqual(deleteUgcMediaSuccess({media: mockMedia}));
        expect(b).toEqual(syncUgc());
      });
    });

    it('should not emit any action when user cancels the confirmation alert', done => {
      alertCtrlSpy.create.and.returnValue(
        Promise.resolve(makeAlertMock('cancel') as any),
      );

      actions$ = of(deleteUgcMedia({media: mockMedia}));

      let actionEmitted = false;
      effects.deleteUgcMedia$.subscribe(() => {
        actionEmitted = true;
      });

      setTimeout(() => {
        expect(actionEmitted).toBeFalse();
        done();
      }, 150);
    });

    it('should dispatch deleteUgcMediaFailure when media has no id', done => {
      actions$ = of(deleteUgcMedia({media: mockMediaNoId}));

      effects.deleteUgcMedia$.subscribe(action => {
        if (action.type === deleteUgcMediaFailure.type) {
          expect((action as any).error).toBe('Media ID not found');
          done();
        }
      });
    });
  });
});
