import {TestBed} from '@angular/core/testing';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {currentEcPoiId, currentEcTrack} from '@wm-core/store/features/ec/ec.selector';
import {currentUgcPoiId, currentUgcTrackId} from '@wm-core/store/features/ugc/ugc.selector';
import {currentEcLayer} from '@wm-core/store/user-activity/user-activity.selector';
import {user} from '@wm-core/store/auth/auth.selectors';
import {IUser} from '@wm-core/store/auth/auth.model';
import {PosthogContextService} from './posthog-context.service';
import {PosthogCapacitorClient} from './posthog-capacitor.client';
import {GeolocationService} from './geolocation.service';

describe('PosthogContextService — user_id', () => {
  let service: PosthogContextService;
  let store: MockStore;
  let clientSpy: jasmine.SpyObj<PosthogCapacitorClient>;

  const mockUser: IUser = {id: 42, access_token: 'test-token'};

  beforeEach(() => {
    // Difesa esplicita contro stato TestBed residuo da suite precedenti che gestiscono
    // TestBed.resetTestingModule() manualmente (vedi posthog-capacitor.client.spec.ts):
    // se il modulo di test risultasse già istanziato, configureTestingModule() sotto
    // lancerebbe "Cannot configure the test module when the test module has already
    // been instantiated". No-op quando il teardown automatico ha già fatto il suo lavoro.
    TestBed.resetTestingModule();

    clientSpy = jasmine.createSpyObj('PosthogCapacitorClient', [
      'capture',
      'identify',
      'initAndRegister',
      'reset',
    ]);
    clientSpy.capture.and.returnValue(Promise.resolve());

    TestBed.configureTestingModule({
      providers: [
        PosthogContextService,
        {provide: PosthogCapacitorClient, useValue: clientSpy},
        {provide: GeolocationService, useValue: {location: null}},
        provideMockStore({
          selectors: [
            {selector: currentEcLayer, value: null},
            {selector: currentEcPoiId, value: null},
            {selector: currentUgcPoiId, value: null},
            {selector: currentEcTrack, value: null},
            {selector: currentUgcTrackId, value: null},
            {selector: user, value: undefined},
          ],
        }),
      ],
    });

    store = TestBed.inject(MockStore);
    service = TestBed.inject(PosthogContextService);
  });

  afterEach(() => {
    store.resetSelectors();
  });

  it('omette user_id quando nessun utente è loggato', async () => {
    await service.capture('testEvent');

    const props = clientSpy.capture.calls.mostRecent().args[1];
    expect(props.user_id).toBeUndefined();
  });

  it("include user_id quando l'utente è loggato", async () => {
    store.overrideSelector(user, mockUser);
    store.refreshState();

    await service.capture('testEvent');

    const props = clientSpy.capture.calls.mostRecent().args[1];
    expect(props.user_id).toBe(42);
  });

  it('aggiorna user_id reattivamente al login e al logout, senza reinizializzare il servizio', async () => {
    await service.capture('beforeLogin');
    expect(clientSpy.capture.calls.mostRecent().args[1].user_id).toBeUndefined();

    store.overrideSelector(user, mockUser);
    store.refreshState();
    await service.capture('afterLogin');
    expect(clientSpy.capture.calls.mostRecent().args[1].user_id).toBe(42);

    store.overrideSelector(user, undefined);
    store.refreshState();
    await service.capture('afterLogout');
    expect(clientSpy.capture.calls.mostRecent().args[1].user_id).toBeUndefined();
  });
});
