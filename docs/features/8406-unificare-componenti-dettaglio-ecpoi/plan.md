> Ticket: oc:8406

# Unificare i componenti di dettaglio EcPoi — wm-core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promuovere `PoiPropertiesComponent` in wm-core, derivare `address`/`address_link` via util pura (non nello store), e far sì che `wm-phone` gestisca CSV multipli con `tel:` validi.

**Architecture:** Copia del componente da webmapp-app in `projects/wm-core/src/poi-properties/`, export da `WmCoreModule`. Derivazione indirizzo in util pura richiamata nel componente. `wm-phone` splita la stringa e renderizza N `ion-item`. L'indirizzo va in `wm-address` nella sezione Contatti (sopra phone/email, icona pin + testo, link Maps); a `wm-tab-detail` si passano properties senza `address`. Contatti e Link utili sono sezioni separate (solo EcPoi).

**Tech Stack:** Angular 20, NgRx, Ionic 8, Jasmine/Karma, wm-types.

**Spec:** `docs/features/8406-unificare-componenti-dettaglio-ecpoi/overview.md` (questo repo).

**Piani correlati:** `webmapp-app/docs/features/8406-.../plan.md` (delete locale + pin — **dopo** questo piano). Fase C wm-webapp: fuori scope, dopo merge.

## Global Constraints

- Firma **store-only**: nessun `@Input` su `PoiPropertiesComponent`.
- Derivazione address **non** in `currentPoiProperties` — solo util pura nel componente.
- Gate `showTechnicalDetails$` = solo `ele`.
- Indirizzo in `wm-address` sopra `wm-phone` nella sezione Contatti (no label “Indirizzo”); `wm-tab-detail` riceve properties senza `address`.
- Gate `showContacts$` = `address || contact_phone || contact_email`; `showUsefulUrls$` = solo `related_url` (EcTrack/UGC non toccati).
- Split telefono: `,` + trim + scarta vuoti; `tel:` = solo `[0-9+]` dalla label.
- Commit isolato per il cambio `wm-phone` (bisect).
- Nessun `OPTIONS.*` kill switch.
- Commit messages: `feat(oc:8406): ...` / `fix(oc:8406): ...` / `test(oc:8406): ...` — **non** eseguire commit senza conferma utente.
- Ordine merge pin: wm-types → wm-core → webmapp-app.

---

### Task 1: Tipizzare `address` / `address_link` in wm-types

**Files:**
- Modify: submodule `wm-types` → `src/feature.ts` (`WmProperties`)
- Repo: creare branch `feature/oc-8406-unificare-componenti-dettaglio-ecpoi` in wm-types se non esiste

**Interfaces:**
- Consumes: nessuno
- Produces: `WmProperties.address?: string`, `WmProperties.address_link?: string` (opzionali, espliciti; resta `[key: string]: any`)

- [ ] **Step 1: Aggiungere i campi a `WmProperties`**

In `src/feature.ts`, dentro `WmProperties` (prima dell'index signature), aggiungere:

```typescript
  /** Indirizzo display (backend o derivato client da addr_*). */
  address?: string;
  /** Indirizzo URL-safe per link mappe (join `+`). */
  address_link?: string;
```

- [ ] **Step 2: Verificare che i consumer compilino**

Dal repo che punta al submodule: nessun errore TS nuovo.

- [ ] **Step 3: Commit (solo dopo conferma utente)**

```
feat(oc:8406): tipizzare address e address_link su WmProperties
```

---

### Task 2: Util `derivePoiAddress` + spec

**Files:**
- Create: `projects/wm-core/src/utils/derive-poi-address.ts`
- Create: `projects/wm-core/src/utils/derive-poi-address.spec.ts`

**Interfaces:**
- Consumes: `WmProperties` (Task 1)
- Produces: `derivePoiAddress(props: WmProperties | null | undefined): {address: string; address_link: string}`

Precedenza `address`:
1. `props.address` non vuoto (già dal backend)
2. altrimenti `props.addr_complete`
3. altrimenti `join([addr_locality, addr_street].filter(Boolean), ', ')`
4. altrimenti `''`

`address_link`: stesse fonti (non ignorare `addr_complete` come fa oggi il popup web), parti joinate con `+`. Se solo `address` backend senza `addr_*`, usare quello (spazi → `+` o encode minimale coerente col web).

- [ ] **Step 1: Scrivere lo spec che fallisce**

Casi minimi:
- `addr_complete` → address e address_link
- solo locality+street → join `, ` / `+`
- `address` già valorizzato vince su `addr_*`
- null/undefined → `{address:'', address_link:''}`

- [ ] **Step 2: Implementare l'util**

- [ ] **Step 3: Far passare i test**

Run (da `core/src/app/shared/wm-core/`):

```bash
nvm use 22 && CI=true npx ng test wm-core --configuration=ci --include='**/derive-poi-address.spec.ts'
```

(o equivalente include del progetto; se `include` CLI non filtra, lanciare la suite wm-core e verificare i nuovi spec).

- [ ] **Step 4: Commit (dopo conferma)**

```
feat(oc:8406): add derivePoiAddress util
```

---

### Task 3: Util split telefono + `wm-phone` multiplo (commit isolato)

**Files:**
- Create: `projects/wm-core/src/phone/split-phones.ts`
- Create: `projects/wm-core/src/phone/split-phones.spec.ts`
- Modify: `projects/wm-core/src/phone/phone.component.ts`

**Interfaces:**
- Consumes: nessuno
- Produces: `splitPhones(raw: string | null | undefined): string[]`, `telHref(label: string): string`
- `WmPhoneComponent`: input `phone` invariato; template fa `*ngFor` su `splitPhones(phone)`

- [ ] **Step 1: Spec split**

Casi: `"a, b"`, `"a,,b"`, spazi, `"+39 06 123"`, stringa vuota → `[]`.

- [ ] **Step 2: Implementare `splitPhones` / `telHref`**

`telHref`: tenere solo `[0-9+]` dalla label (o equivalente che non introduca caratteri illegali in `tel:`).

- [ ] **Step 3: Aggiornare template inline di `WmPhoneComponent`**

Un `ion-item` per numero; stesso stile esistente.

- [ ] **Step 4: Test**

```bash
nvm use 22 && CI=true npx ng test wm-core --configuration=ci
```

Verificare i nuovi spec.

- [ ] **Step 5: Commit isolato (dopo conferma)**

```
fix(oc:8406): support multiple contact_phone values in wm-phone
```

---

### Task 4: Promuovere `PoiPropertiesComponent` in wm-core

**Files:**
- Create: `projects/wm-core/src/poi-properties/poi-properties.component.ts`
- Create: `projects/wm-core/src/poi-properties/poi-properties.component.html`
- Create: `projects/wm-core/src/poi-properties/poi-properties.component.scss`
- Create: `projects/wm-core/src/poi-properties/poi-properties.component.spec.ts`
- Modify: `projects/wm-core/src/wm-core.module.ts` (declare + export)
- Modify: `projects/wm-core/src/localization/i18n/{de,en,es,fr,it,pr,sq}.ts` — chiave `'Indirizzo'`

**Source of truth da copiare:**  
`webmapp-app/core/src/app/components/poi-properties/*` (al momento del task, prima del delete nel piano webmapp-app).

**Interfaces:**
- Consumes: `derivePoiAddress` (Task 2), `currentPoiProperties`, selettori già usati dal componente locale
- Produces: selector `wm-poi-properties` esportato da `WmCoreModule`

- [ ] **Step 1: Copiare i 3 file del componente e adattare gli import** (`@wm-core/...`)

- [ ] **Step 2: Applicare `derivePoiAddress` nel pipe delle properties**

Esempio: mappare l'emissione di `currentPoiProperties$` con

```typescript
map(properties => {
  if (!properties) return properties;
  const {address, address_link} = derivePoiAddress(properties);
  return {...properties, address, address_link};
}),
    tap(properties => {
      this.showTechnicalDetails$.next(!!properties?.ele);
      this.showContacts$.next(
        !!(properties?.address || properties?.contact_phone || properties?.contact_email),
      );
      this.showUsefulUrls$.next(!!properties?.related_url);
    }),
```

Sezione Contatti (titolo + `ion-list` con `wm-address` → `wm-phone` → `wm-email`); `wm-feature-useful-urls` solo con `wm-related-urls`. Passare a `wm-tab-detail` `omitAddress(properties)`.

- [ ] **Step 3: Dichiarare/esportare in `WmCoreModule`** (anche `WmAddressComponent`)

- [ ] **Step 4: Spec sul modello `ugc-track-properties.component.spec.ts`**

Istanza TS pura (`new`, no TestBed): address-only → Contatti sì / Link utili no / tecnici no; phone+ele → Contatti+tecnici; related_url only → Link utili sì; `omitAddress` toglie `address`.

- [ ] **Step 5: i18n** — chiave `Contatti` (7 lingue); label “Indirizzo” non usata in `wm-address`

- [ ] **Step 6: Test wm-core CI**

```bash
nvm use 22 && CI=true npx ng test wm-core --configuration=ci
```

- [ ] **Step 7: Commit (dopo conferma)**

```
feat(oc:8406): promote wm-poi-properties into wm-core
```

---

### Task 5: Smoke locale (opzionale ma consigliato)

- [ ] Servire un host che punta a questo branch wm-core (webmapp-app sul branch feature) e aprire un EcPoi: indirizzo sopra i contatti (icona + testo), telefoni multipli ok; tecnici solo se c’è `ele`.
- [ ] Non bumpare ancora il pin in webmapp-app — quello è il piano correlato.
