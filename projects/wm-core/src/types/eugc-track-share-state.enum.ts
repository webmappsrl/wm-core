/**
 * UI state machine for the "Condividi" (share) action in `UgcTrackPropertiesComponent`.
 *
 * `ugc-track-properties` only tracks these states locally: it has no access to the map
 * instance nor to any native share plugin. Screenshot generation (map-core) and the
 * actual native Stories share invocation happen in the parent repo (webmapp-app), which
 * reports the outcome back via the `shareResult` input (see `UgcTrackShareResult`).
 */
export enum EUgcTrackShareState {
  ERROR = 'error',
  GENERATING = 'generating',
  IDLE = 'idle',
  SUCCESS = 'success',
}
