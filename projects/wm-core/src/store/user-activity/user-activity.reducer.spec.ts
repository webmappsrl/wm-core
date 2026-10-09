import {userActivityReducer, UserActivityState} from './user-activity.reducer';
import {inputTyped, routeFiltersChanged} from './user-activity.action';

describe('userActivityReducer — routeFiltersChanged', () => {
  it('sostituisce interamente routeFilters con il payload dell\'azione', () => {
    const initial = userActivityReducer(undefined, {type: '@@INIT'} as any);
    expect(initial.routeFilters).toEqual({});

    const afterFirst = userActivityReducer(
      initial,
      routeFiltersChanged({filters: {shape: ['roundtrip']}}),
    );
    expect(afterFirst.routeFilters).toEqual({shape: ['roundtrip']});

    const afterReset = userActivityReducer(afterFirst, routeFiltersChanged({filters: {}}));
    expect(afterReset.routeFilters).toEqual({});
  });
});

describe('userActivityReducer — inputTyped (oc:8684)', () => {
  it('con restored true imposta inputTypedRestored a true', () => {
    const initial = userActivityReducer(undefined, {type: '@@INIT'} as any);
    expect(initial.inputTypedRestored).toBeFalse();

    const state = userActivityReducer(
      initial,
      inputTyped({inputTyped: 'due mari', restored: true}),
    );
    expect(state.inputTyped).toBe('due mari');
    expect(state.inputTypedRestored).toBeTrue();
  });

  it('senza restored riporta inputTypedRestored a false', () => {
    const initial = userActivityReducer(undefined, {type: '@@INIT'} as any);
    const restored = userActivityReducer(
      initial,
      inputTyped({inputTyped: 'due mari', restored: true}),
    );

    const state = userActivityReducer(restored, inputTyped({inputTyped: 'fontana'}));
    expect(state.inputTyped).toBe('fontana');
    expect(state.inputTypedRestored).toBeFalse();
  });
});
