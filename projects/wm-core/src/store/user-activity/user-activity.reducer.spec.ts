import {userActivityReducer, UserActivityState} from './user-activity.reducer';
import {routeFiltersChanged} from './user-activity.action';

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
