> Ticket: oc:8164

# Notes — Logo cammino in backoffice e app (Frontend)

## Deviazioni dal piano

- La mitigazione "nascondi overlay su errore di caricamento immagine" proposta in fase di challenge è stata rimossa dai requisiti prima della scrittura del piano: `wm-img` (componente condiviso) non espone un evento `(error)`, e modificarlo per aggiungerlo avrebbe toccato un componente usato ovunque nell'app per `feature_image` — sproporzionato per questo ticket. Rischio noto accettato senza mitigazione (vedi overview.md, sezione Rischi).
- **Positioning del badge cambiato durante la verifica visiva**: il piano prevedeva `<wm-img class="...-logo-overlay">` come elemento fratello della feature image, posizionato `position:absolute` relativo a `.wm-box`/al contenitore wrapper. In verifica visiva (screenshot reali) il badge risultava disallineato — margini bottom/right diversi tra loro e overlay che usciva dai confini della foto. Causa: in `home-layer`, la regola `wm-img { margin: 10px; }` rende il contenitore più grande dell'immagine visibile di 20px; in `layer-box` il mismatch era più sottile (dipendente da layout flex). Fix adottato in entrambi i componenti: il badge è nidificato **dentro** il tag `<wm-img>` della feature image (via content projection/`ng-content`), esattamente come già fa `.wm-box-title` — così si posiziona sempre relativo ai confini reali della foto, non del contenitore esterno.

## Bug trovati

- **`wm-img` — bug preesistente, non introdotto da questa feature**: l'elemento `<img class="wm-img-image">` in `shared/img/img.component.scss` non aveva `display: block`. Un `<img>` è `inline` per default nel browser: lasciava un piccolo "phantom gap" bianco sotto l'immagine (spazio da baseline dell'inline formatting context), rendendo l'host `wm-img` visibilmente più alto della foto effettivamente renderizzata. Probabilmente presente ovunque `wm-img` sia usato nell'app, ma mai notato perché mascherato da overlay scuri (`filter: brightness(75%)`) o dal fatto che nessun altro elemento veniva posizionato in modo assoluto relativo ai confini esatti dell'immagine prima di questa feature. Fix: aggiunto `display: block` a `.wm-img-image` — correzione CSS standard, nessun effetto collaterale comportamentale, beneficia tutti i consumer esistenti di `wm-img` in tutta l'app.

## Decisioni

- `hasLogo` implementata come pipe pura condivisa (non funzione util) per seguire la convenzione di naming/registrazione già presente in `pipes/pipe.module.ts` (es. `wm-filter-is-selected.pipe.ts`).
- Test unitario aggiunto solo per la pipe `hasLogo` (isolata, nessuna dipendenza da TestBed) — non aggiunti test per `layer-box.component` e `home-layer.component`, coerente con l'assenza di `.spec.ts` preesistenti su questi due componenti.
- Campo `logo_image` inserito in `IGeojsonProperties` (`types/model.ts`) in ordine alfabetico (tra `kml_url` e `mbtiles`), non subito dopo `feature_image` come nella bozza iniziale del piano — il file segue una convenzione di ordinamento alfabetico dei campi.
- Posizione dell'overlay: basso a destra in entrambi i componenti, perché basso-sinistra è occupato dal titolo (`.wm-box-title`) e alto-destra nel box lista è occupato dal badge contatore (`wm-layer-features-counter-badge`, es. "30 Sentieri").
- Box-shadow del badge cambiato da `0 1px 4px` (offset verticale) a `0 0 4px` (centrato) — un'ombra con offset verticale creava un'asimmetria visiva percepita tra il margine bottom e right anche a parità di valori numerici (8px entrambi).

## Follow-up

- Nessuno pianificato. Il riuso di `logo_image` come immagine badge nel sistema passaporto è tracciato in un ticket separato non ancora esistente.
