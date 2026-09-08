> Ticket: oc:8164

# Logo cammino in backoffice e app — Frontend

## Cosa cambia

Il layer/cammino espone ora un campo `logo_image` (backend già completato in `wm-package`, oc:8272, in `develop`): un URL stringa (PNG/WebP, proporzione quadrata 1:1) o assente/`null` quando il gestore non ha ancora caricato un logo. Il frontend deve mostrare questo logo come overlay in due punti dell'app:

1. **Box lista cammini** (`layer-box.component`, wm-core) — overlay in un angolo della card, sovrapposto a `feature_image`
2. **Schermata di dettaglio del cammino** (`home-layer.component`, wm-core) — visualizzazione del logo nella vista di dettaglio

Entrambi i componenti toccati vivono nel submodule `wm-core`. Il componente `layer-box` duplicato in `wm-webapp/src/app/components/common/layer-box` non è referenziato da nessun template — è codice morto, non va toccato.

`logo_image` viene letto dallo stesso `config.json` per app/shard già usato per `feature_image` (nessun endpoint HTTP separato): sia il box lista che il dettaglio leggono dall'array `confMAP.layers`, popolato da un'unica chiamata a `ConfService.getConf()`.

## Perché

Il cliente vuole un'identità visiva ufficiale per ogni cammino, distinta dalla foto di copertina (`feature_image`), caricabile dal gestore via Nova. Il logo sarà riutilizzato in futuro come immagine badge nel sistema passaporto (ticket separato, non ancora esistente) — per questo il backend impone proporzione quadrata 1:1.

## Requisiti

- [ ] `IGeojsonProperties` (`wm-core/projects/wm-core/src/types/model.ts`): aggiungere `logo_image?: string;` (stringa opzionale, non oggetto `WmImage` — diverso da `feature_image`)
- [ ] Stesso campo aggiunto ai tipi gemelli: `wm-webapp/src/app/types/model.d.ts` e `map-core/src/types/model.ts` (per consistenza, se richiesti dal build)
- [ ] Helper condiviso (es. pipe o funzione util in `wm-core`, tipo `hasLogo(layer)`) per la condizione di presenza del logo (chiave presente e non vuota) — riusato in entrambi i componenti invece di duplicare la logica a mano, per evitare drift futuro se la condizione cambia
- [ ] `layer-box.component.html`/`.ts` (wm-core): overlay del logo in un angolo della card, visibile solo se il logo è presente (via helper condiviso, non solo `!= null` — deve gestire anche la chiave assente per shard/backend non ancora aggiornati)
- [ ] `home-layer.component.html`/`.ts` (wm-core): visualizzazione del logo nella schermata di dettaglio, stessa condizione di presenza (via helper condiviso)
- [ ] Stile overlay: badge quadrato (~40-48px), sfondo bianco semi-trasparente, drop-shadow leggero per leggibilità su `feature_image` variabili — nessun mockup fornito, si applicano best practice UI esistenti nel componente
- [ ] Nessun placeholder/icona fallback quando `logo_image` è assente o `null` — il box e il dettaglio restano visivamente identici a oggi

## Rischi

- **Formato dati diverso da `feature_image`** — `logo_image` è sempre stringa URL o assente, mentre `feature_image` nel dettaglio (`home-layer.component.ts`) è tipizzato come oggetto `WmImage`. Va usato il tag `<wm-img>` con lo stesso pattern già in uso (gestisce entrambe le forme), senza assumere struttura oggetto per `logo_image`.
- **Shard/backend non aggiornati** — non tutti gli shard hanno il backend aggiornato con la feature. Il template deve verificare la presenza della chiave (`*ngIf="layer?.logo_image"`), non solo la sua nullità, e l'interfaccia TS deve marcare il campo come opzionale (`?`).
- **Dipendenza con ticket badge/passaporto** — nessuna azione richiesta ora; la proporzione quadrata è già garantita dal backend per riuso futuro.
- **Nessuna gestione di errore di caricamento (URL presente ma non risolvibile, es. media cancellato/404)** — `wm-img` (componente condiviso in `shared/img/`) non espone un evento `(error)`; la src arriva da una pipeline asincrona (`getImg()`, cache offline/localForage) e modificarlo per aggiungere gestione errore toccherebbe un componente usato ovunque nell'app per `feature_image`, sproporzionato per questo ticket. Rischio noto, accettato senza mitigazione — stesso pattern già seguito per l'assenza di test su questi componenti (oc:8221).

## Out of scope

- Backend (già completato in oc:8272, `wm-package`, `develop`)
- Placeholder/icona fallback per logo assente
- Logica badge/passaporto (ticket separato, non ancora esistente)
- Componente `wm-webapp/src/app/components/common/layer-box` (codice morto, non referenziato)

## Moduli toccati

**wm-core (submodule, `src/app/shared/wm-core/`):**
- `projects/wm-core/src/types/model.ts`
- `projects/wm-core/src/box/layer-box/layer-box.component.html`
- `projects/wm-core/src/box/layer-box/layer-box.component.ts`
- `projects/wm-core/src/box/layer-box/layer-box.component.scss`
- `projects/wm-core/src/home/home-layer/home-layer.component.html`
- `projects/wm-core/src/home/home-layer/home-layer.component.ts`
- `projects/wm-core/src/home/home-layer/home-layer.component.scss`

**Verifica visiva (dato di test reale):** shard `camminiditaliadev`, layer id `56` (`Cammino Minerario di Santa Barbara`) ha `logo_image` già popolato.
