// Costanti per la feature "distanza rimanente e posizione nel profilo altimetrico" (oc:8177).
// Usate da geoutils.service.ts, slope-chart.component.ts e user-activity.effects.ts.

// Palette fissa, non legata al tema (--wm-color-primary varia da istanza a istanza): stessa
// tonalità blu dell'icona "sei qui" (WmMapPositionDirective/location-icon.png), per dare a
// tutti gli indicatori di posizione GPS live un'identità visiva coerente in tutta l'app,
// indipendente dal brand dell'istanza. Duplicata in tab-detail.component.scss
// (variabile Sass $wm-location-marker-color) — se cambia va aggiornata anche lì.
export const LOCATION_MARKER_COLOR = '#4285F4';
// Solo per l'uso diretto in stringhe rgba() lato canvas (TS, non Sass) — vedi slope-chart.component.ts.
export const LOCATION_MARKER_COLOR_RGB = '66, 133, 244';

// Il chart non ascolta eventi di fine tocco (events: [...] non include touchend/mouseout),
// quindi il tooltip di Chart.js resta attivo indefinitamente dopo l'ultima interazione.
// Questo timer forza la chiusura del tooltip trascorso questo tempo di inattività, per far
// ricomparire il marker GPS.
export const HOVER_DISMISS_DELAY_MS = 2500;

// Soglia oltre la quale la posizione GPS mostrata viene considerata "non aggiornata".
export const TRACK_POSITION_STALE_THRESHOLD_MS = 60_000;

// Velocità massima plausibile di un utente in movimento (camminata, corsa leggera o bici/e-bike
// durante la registrazione UGC, oc:8284), usata come soglia per il fallback a ricerca globale in
// GeoutilsService.getRemainingDistance quando lo spostamento implicito rispetto all'ultimo
// trackProgress noto supera questo limite.
export const REMAINING_DISTANCE_MAX_SPEED_MS = 8;
export const REMAINING_DISTANCE_MIN_PLAUSIBLE_JUMP_M = 150;
export const REMAINING_DISTANCE_LOCAL_WINDOW_RATIO = 0.15;
export const REMAINING_DISTANCE_LOCAL_WINDOW_MIN_M = 300;
export const REMAINING_DISTANCE_OFF_TRACK_THRESHOLD_M = 100;
