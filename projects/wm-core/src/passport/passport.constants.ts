import {CaptureOptions} from '@wm-core/services/camera.service';

/** Foto minime obbligatorie nella richiesta di certificazione (oc:8166). */
export const PASSPORT_MIN_PHOTOS = 1;
/** Foto massime nella richiesta di certificazione: si cambia qui (oc:8166). */
export const PASSPORT_MAX_PHOTOS = 6;
/** Acquisizione delle foto della credenziale: ridotte e senza accendere il GPS. */
export const PASSPORT_PHOTO_CAPTURE: CaptureOptions = {
  maxWidth: 1600,
  quality: 80,
  startNavigation: false,
};
