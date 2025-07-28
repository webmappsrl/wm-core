import {createAction, props} from '@ngrx/store';
import {Filter, ILAYER} from '@wm-core/types/config';
import {WmFeature} from '@wm-types/feature';
import {WmSlopeChartHoverElements} from '@wm-types/slope-chart';
import {MultiPolygon, Point} from 'geojson';
import {mapDetailsStatus} from './user-activity.reducer';
import {Hit} from '@wm-types/elastic';
import {Location} from '@capacitor-community/background-geolocation';

export const openUgc = createAction('[User Activity] Open User Generated Content');
export const closeUgc = createAction('[User Activity] Close User Generated Content');
export const setMapDetailsStatus = createAction(
  '[User Activity] Set Map Details Status',
  props<{status: mapDetailsStatus}>(),
);
export const openDownloads = createAction('[User Activity] Open User downloads');
export const closeDownloads = createAction('[User Activity] Close User downloads');
export const inputTyped = createAction(
  '[User Activity] set input typed',
  props<{inputTyped: string | null}>(),
);
export const setLoading = createAction('[User Activity] Set Loading', props<{loading: boolean}>());

export const addTrackFilters = createAction(
  '[User Activity] add track filters',
  props<{trackFilters: {identifier: string}[]}>(),
);
export const removeTrackFilters = createAction(
  '[User Activity] remove track filters',
  props<{trackFilters: {identifier: string}[]}>(),
);
export const toggleTrackFilterByIdentifier = createAction(
  '[User Activity] toggle track filter by identifier',
  props<{identifier: string; taxonomy?: string}>(),
);

export const resetTrackFilters = createAction('[User Activity] reset track filters');
export const updateTrackFilter = createAction(
  '[User Activity] update track filter',
  props<{filter: Filter}>(),
);
export const setCurrentLayer = createAction(
  '[User Activity] Set current layer',
  props<{currentLayer: ILAYER}>(),
);
export const setCurrentPoi = createAction(
  '[User Activity] Set current poi',
  props<{currentPoi: WmFeature<Point>}>(),
);
export const setCurrentRelatedPoi = createAction(
  '[User Activity] Set current related poi',
  props<{currentRelatedPoi: WmFeature<Point>}>(),
);
export const setCurrentFilters = createAction(
  '[User Activity] Set current Filters',
  props<{currentFilters: any[]}>(),
);

export const loadConfFail = createAction('[User Activity] Set current layer Success Fail');
export const goToHome = createAction('[User Activity] Go to Home');
export const resetMap = createAction('[User Activity] Reset Map');
export const setLayer = createAction('[User Activity] set Layer', props<{layer: any | null}>());
export const setLastFilterType = createAction(
  '[User Activity] set last filter type',
  props<{filter: 'tracks' | 'pois' | null}>(),
);
export const toggleTrackFilter = createAction(
  '[User Activity] toggle track filter',
  props<{filter: Filter}>(),
);

export const applyWhere = createAction(
  '[User Activity] pois: apply where',
  props<{where: string[]}>(),
);
export const togglePoiFilter = createAction(
  '[User Activity] pois toggle filter',
  props<{filterIdentifier: string}>(),
);
export const resetPoiFilters = createAction('[User Activity] pois: reset all pois filters');

export const startLoader = createAction(
  '[User Activity] loader: start loader',
  props<{identifier: 'layer' | 'pois'}>(),
);
export const stopLoader = createAction(
  '[User Activity] loader: stop loader',
  props<{identifier: 'layer' | 'pois'}>(),
);
export const drawTrackOpened = createAction(
  '[User Activity] draw track opened',
  props<{drawTrackOpened: boolean}>(),
);
export const drawPoiOpened = createAction(
  '[User Activity] draw poi opened',
  props<{drawPoiOpened: boolean}>(),
);

export const trackElevationChartHoverElemenents = createAction(
  '[User Activity] track elevation chart hover elements',
  props<{elements: WmSlopeChartHoverElements}>(),
);

export const openUgcUploader = createAction('[User Activity] open ugc uploader');

export const wmMapHitMapChangeFeatureById = createAction(
  '[User Activity] hit map change feature by id',
  props<{id: number}>(),
);

export const backOfMapDetails = createAction('[User Activity] back of map details');

export const loadHitmapFeatures = createAction(
  '[User Activity] load hitmap features',
  props<{url: string}>(),
);
export const loadHitmapFeaturesSuccess = createAction(
  '[User Activity] Load configuration Success',
  props<{wmMapHitmapFeatures: WmFeature<MultiPolygon>[]}>(),
);
export const loadHitmapFeaturesFail = createAction('[User Activity] Load configuration Fail');

export const wmMapFeaturesInViewport = createAction(
  '[User Activity] wm map features in viewport',
  props<{featureIds: number[]}>(),
);
export const wmMapFeaturesInViewportSuccess = createAction(
  '[User Activity] wm map features in viewport success',
  props<{featuresInViewport: Hit[]}>(),
);
export const wmMapFeaturesInViewportFailure = createAction(
  '[User Activity] wm map features in viewport failure',
);

export const startDrawUgcPoi = createAction(
  '[User Activity] start draw ugc poi',
  props<{ugcPoi: WmFeature<Point>}>(),
);
export const stopDrawUgcPoi = createAction('[User Activity] stop edit ugc poi');

export const setHomeResultTabSelected = createAction('[User Activity] set home result tab selected', props<{tab: 'tracks' | 'pois' | null}>());

export const setCurrentLocation = createAction('[User Activity] set current location', props<{location: Location}>());

export const startGetDirections = createAction('[User Activity] get directions');
export const getDirections = createAction('[User Activity] get directions success', props<{coordinates: number[]}>());
export const openLoginModal = createAction('[User Activity] open login modal');

export const setEnableRecoderPanel = createAction('[User Activity] set enable register panel', props<{enable: boolean}>());
export const setOnRecord = createAction('[User Activity] set on record', props<{onRecord: boolean}>());
export const setFocusPosition = createAction('[User Activity] set focus position', props<{focusPosition: boolean}>());
