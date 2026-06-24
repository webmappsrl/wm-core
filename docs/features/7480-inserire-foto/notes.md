> Ticket: oc:7480

# Notes — [wm-package][app] inserire foto (wm-core)

## Decisioni

- `ugc-box.component.ts` espone `myPathsImage$: Observable<string>` tramite `confAPP` selector — su web usa `APP.myPaths` (URL S3) quando disponibile, con fallback a `assets/images/profile/my-path.webp`
- Su native mobile (`Capacitor.isNativePlatform() === true`) usa sempre il path locale, ignorando l'URL S3: gulp ha già scaricato l'immagine custom in `assets/images/profile/my-path.webp` durante il build
- `ugc-box.component.html` usa `[src]="myPathsImage$ | async"` — rimosso `defaultPhotoPath`
- `downloads-ec-track-box` escluso — funzionalità mobile only, nessuna modifica necessaria

## Code review

**Finding bloccante risolto** (Alessandro Peci, 24-06-2026): regressione offline mobile — `myPathsImage$` con URL S3 falliva su mobile senza rete.

**Fix suggerito nel ticket:** `(error)="$event.target.src = 'assets/images/profile/my-path.webp'"` nel template, oppure input `errorSrc` su `<wm-img>`.

**Fix applicato:** `Capacitor.isNativePlatform()` in `ugc-box.component.ts`. Su native usa sempre il path locale, su web usa l'URL S3.

**Perché non il fix suggerito:** `(error)` su `<wm-img>` non funziona — è un componente Angular custom che non emette l'evento `error` nativo. L'alternativa `errorSrc` avrebbe richiesto modificare l'API di `wm-img`. Il platform detection è più corretto semanticamente: su native, gulp garantisce che il path locale sia già l'immagine custom corretta, quindi l'URL S3 è ridondante e rischioso offline.

## Follow-up

- Rischio CORS: nella versione web l'immagine è caricata direttamente dall'URL S3 — verificare che il bucket permetta richieste dal dominio della webapp
