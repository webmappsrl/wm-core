// Configurazione fake-indexeddb per localforage (deve essere prima di tutto)
import 'fake-indexeddb/auto';

// Polyfill per structuredClone (non disponibile in Node.js)
if (!(window as any).structuredClone) {
  (window as any).structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj));
}

import {setupZoneTestEnv} from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv();
