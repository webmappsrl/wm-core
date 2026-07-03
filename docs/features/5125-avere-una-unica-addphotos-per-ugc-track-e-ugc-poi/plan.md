> Ticket: oc:5125

# Piano — Avere una unica AddPhotos per ugc-track e ugc-poi

Repo: `wm-core` (submodule). Nessuna modifica al repo principale `webmapp-app` né ad altri submodule.

## Task 1 — Creare `UgcPropertiesBaseComponent`

File: `projects/wm-core/src/ugc-properties-base/ugc-properties-base.component.ts` (nuovo)

- Classe astratta `UgcPropertiesBaseComponent`
- Campo protetto `_photos: Media[] = []`
- Metodo pubblico `photosChanged(photos: Media[]): void { this._photos = photos; }`
- Nessun costruttore, nessuna injection: la classe è puramente un contenitore di stato/logica sincrona, per non forzare le sottoclassi ad allineare le proprie dipendenze DI a quelle della base.
- Import `Media` da `@wm-types/feature` (stesso import già usato in entrambi i componenti target).

Commit: `feat(oc:5125): add UgcPropertiesBaseComponent to share photo state`

## Task 2 — Refactor `UgcPoiPropertiesComponent`

File: `projects/wm-core/src/ugc-poi-properties/ugc-poi-properties.component.ts`

- `export class UgcPoiPropertiesComponent extends UgcPropertiesBaseComponent`
- Rimuovere la dichiarazione locale `private _photos: Media[] = [];` (nessuna ridichiarazione, nemmeno vuota — vedi rischio class-field-shadowing in overview.md)
- Rimuovere il metodo locale `photosChanged(photos: Media[]): void { this._photos = photos; }` (ereditato dalla base)
- Rimuovere il metodo `enableEditing(): void { this.isEditing$; }` (dead code, nessun template lo richiama)
- In `updatePoi()`, sostituire `media: this._photos ?? [],` con `media: this._photos,` (il fallback non serve più: il campo è sempre un array valido per costruzione nella base class)
- Nessun altro cambiamento: import, decoratori, altri metodi restano invariati

Commit: `refactor(oc:5125): extend UgcPropertiesBaseComponent in UgcPoiPropertiesComponent`

## Task 3 — Refactor `UgcTrackPropertiesComponent`

File: `projects/wm-core/src/ugc-track-properties/ugc-track-properties.component.ts`

- `export class UgcTrackPropertiesComponent extends UgcPropertiesBaseComponent`
- Rimuovere la dichiarazione locale `private _photos: Media[] = [];`
- Rimuovere il metodo locale `photosChanged(photos: Media[]): void { this._photos = photos; }`
- Rimuovere il metodo `enableEditing(): void { this.isEditing$; }`
- In `updateTrack()`, sostituire `media: this._photos ?? [],` con `media: this._photos,`
- Nessun altro cambiamento

Commit: `refactor(oc:5125): extend UgcPropertiesBaseComponent in UgcTrackPropertiesComponent`

## Task 4 — Verifica manuale end-to-end

Nessun test automatico (vedi overview.md — spec di componenti wm-core non girano in CI). Verificare manualmente in dev server (`npm start`):

1. Aprire un POI UGC già sincronizzato → modalità edit → aggiungere una foto dalla libreria → salvare → verificare che la foto compaia dopo il salvataggio
2. Aprire un track UGC già sincronizzato → modalità edit → aggiungere una foto → salvare → verificare che la foto compaia
3. Verificare che il bottone "edit" (che chiama `this.isEditing$.next(true)` inline dal template) funzioni ancora identico su entrambi, a conferma che la rimozione di `enableEditing()` non ha effetti (nessun template lo richiamava)
4. Controllare in DevTools/console che non ci siano errori TypeScript/runtime legati a `_photos` non definito o `undefined` in nessuno dei due flussi

Nessun commit associato a questo task (è verifica, non codice).

## Note per l'esecuzione

- Nessun commit automatico durante l'implementazione: i commit sopra sono istruzioni testuali, da eseguire solo dopo approvazione esplicita del developer (vedi Fase: execution → review-gate nel workflow wm-plan).
- Nessuna modifica a `draw-ugc.component.ts`, `ModalSaveComponent` (repo principale), `tsconfig.spec.json` — esplicitamente fuori scope (vedi overview.md).
