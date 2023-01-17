import {IElasticAllRootState, IElasticSearchRootState} from './api.reducer';

export type AppState = IElasticSearchRootState | IElasticAllRootState; /* & OtherRootState  & ... */
