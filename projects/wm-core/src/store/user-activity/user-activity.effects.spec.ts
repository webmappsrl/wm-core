import {TestBed, fakeAsync, tick} from '@angular/core/testing';
import {Actions} from '@ngrx/effects';
import {Action, Store} from '@ngrx/store';
import {BehaviorSubject, Subject, Subscription, of} from 'rxjs';

import {UserActivityEffects} from './user-activity.effects';
import {
  ecLayer,
  filterTracks,
  inputTyped,
  inputTypedRestored,
} from './user-activity.selector';
import {ecTracks} from '@wm-core/store/features/ec/ec.actions';

describe('UserActivityEffects - triggerQueryOnInput$ (oc:8684)', () => {
  let inputTyped$: BehaviorSubject<string | null>;
  let restored$: BehaviorSubject<boolean>;
  let filterTracks$: BehaviorSubject<any[]>;
  let layer$: BehaviorSubject<any>;
  let effects: UserActivityEffects;
  let emitted: Action[];
  let sub: Subscription;

  // Le query emesse con un testo: quella iniziale vuota non interessa.
  const searchQueries = (): any[] => emitted.filter((a: any) => a.inputTyped != null);

  beforeEach(() => {
    TestBed.resetTestingModule();
    inputTyped$ = new BehaviorSubject<string | null>(null);
    restored$ = new BehaviorSubject<boolean>(false);
    filterTracks$ = new BehaviorSubject<any[]>([]);
    layer$ = new BehaviorSubject<any>(null);
    const selected = new Map<any, any>([
      [inputTyped, inputTyped$],
      [inputTypedRestored, restored$],
      [filterTracks, filterTracks$],
      [ecLayer, layer$],
    ]);
    // Store finto: costruito con new per non istanziare l'intera catena di dipendenze.
    const storeStub: any = {
      select: (selector: any) => selected.get(selector) ?? of(null),
      pipe: () => of(null),
      dispatch: () => {},
    };
    effects = new UserActivityEffects(
      new Subject<Action>() as unknown as Actions,
      storeStub as Store,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    emitted = [];
  });

  afterEach(() => {
    sub?.unsubscribe();
    TestBed.resetTestingModule();
  });

  // Va chiamata dentro fakeAsync, altrimenti il debounceTime usa i timer reali.
  const subscribe = (): void => {
    sub = effects.triggerQueryOnInput$.subscribe(action => emitted.push(action));
  };

  // Il reducer imposta inputTyped e inputTypedRestored nello stesso passo.
  const setInput = (text: string, restored: boolean): void => {
    restored$.next(restored);
    inputTyped$.next(text);
  };

  it('una ricerca ripristinata lancia ecTracks con skipSearchTracking', fakeAsync(() => {
    subscribe();
    setInput('due mari', true);
    tick(300);

    expect(searchQueries()).toEqual([
      ecTracks({init: false, inputTyped: 'due mari', skipSearchTracking: true, layer: null}),
    ]);
  }));

  it('una ricerca digitata lancia ecTracks senza skipSearchTracking', fakeAsync(() => {
    subscribe();
    setInput('fontana', false);
    tick(300);

    expect(searchQueries()).toEqual([
      ecTracks({init: false, inputTyped: 'fontana', layer: null}),
    ]);
  }));

  it('dopo una ricerca ripristinata, cambiare filterTracks traccia la query', fakeAsync(() => {
    subscribe();
    setInput('due mari', true);
    tick(300);

    const filter: any = {identifier: 'roundtrip'};
    filterTracks$.next([filter]);

    const queries = searchQueries();
    expect(queries.length).toBe(2);
    expect(queries[1]).toEqual(
      ecTracks({init: false, inputTyped: 'due mari', filterTracks: [filter], layer: null}),
    );
  }));

  it('dopo una ricerca ripristinata, cambiare layer traccia la query', fakeAsync(() => {
    subscribe();
    setInput('due mari', true);
    tick(300);

    layer$.next({id: 7});

    const queries = searchQueries();
    expect(queries.length).toBe(2);
    expect(queries[1].skipSearchTracking).toBeUndefined();
    expect(queries[1].layer).toEqual({id: 7});
  }));
});
