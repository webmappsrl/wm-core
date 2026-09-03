> Ticket: oc:8406

# Unificare i componenti di dettaglio EcPoi — parte wm-core

## Cosa cambia

`PoiPropertiesComponent` (selector `wm-poi-properties`), oggi nel repo applicativo
webmapp-app, viene promosso in wm-core accanto ai suoi tre fratelli già condivisi
(`TrackPropertiesComponent`, `UgcPoiPropertiesComponent`, `UgcTrackPropertiesComponent`).
È l'unico componente aggregato di dettaglio feature rimasto fuori dalla libreria.

Contestualmente wm-core acquisisce:

1. **Normalizzazione dell'indirizzo**: util pura `derivePoiAddress(props)` deriva
   `address` e `address_link` da `addr_complete` / `addr_locality` / `addr_street`
   (e rispetta un `address` già presente dal backend). L'util è richiamata nel
   componente di dettaglio, **non** in `currentPoiProperties`. Precedenza display:
   `address` già valorizzato → altrimenti `addr_complete` → altrimenti
   `join(addr_locality, addr_street, ', ')`. `address_link` usa le stesse fonti
   (URL-safe), senza l'asimmetria del popup web che ignora `addr_complete`.
2. **Indirizzo sopra i contatti** (`wm-address`): icona pin a sinistra + testo
   indirizzo (niente label “Indirizzo”), cliccabile verso Google Maps
   (`daddr` = `address_link` || `address`). Montato **prima** di `wm-phone` /
   `wm-email` nella sezione **Contatti** (titolo dedicato, markup inline —
   non dentro `wm-feature-useful-urls`). **Non** in `wm-tab-detail` (a
   `wm-tab-detail` si passano properties senza `address`).
3. **`contact_phone` multiplo**: CSV splittato su `,` con trim, celle vuote
   scartate; `tel:` = solo cifre e `+`.
4. **Split Contatti / Link utili** (solo EcPoi): `address` / phone / email sotto
   label «Contatti» (i18n `Contatti` + `wmtrans`; titolo con gli stessi token CSS
   di Link utili via `.wm-poi-contacts`); `wm-feature-useful-urls` («Link utili»)
   solo per `related_url`. EcTrack/UGC invariati (hanno solo export/link).

Gate: `showTechnicalDetails$` = solo `ele`; `showContacts$` =
`address || contact_phone || contact_email`; `showUsefulUrls$` = solo
`related_url`.

## Perché

Emerso da oc:8181: il dettaglio POI mobile non passa dai componenti condivisi.
Senza la (1) l'indirizzo resta invisibile su mobile. La collocazione sopra i
contatti (non nei tecnici) è decisione post-QA: le track non hanno `address`,
quindi “allineare ai tecnici” non confronta la stessa voce; il pattern web
(icona + valore, come mail/telefono) è quello richiesto.

## Requisiti

- [ ] `PoiPropertiesComponent` vive in wm-core, dichiarato ed esportato da `WmCoreModule`
- [ ] Firma **store-only**: nessun `@Input`
- [ ] `address` / `address_link` da util pura nel componente (non nello store)
- [ ] Campi tipizzati su `WmProperties` in wm-types
- [ ] `wm-address`: pin + testo, no label “Indirizzo”, link Maps; sopra `wm-phone` in Contatti
- [ ] `wm-tab-detail` riceve properties **senza** `address`
- [ ] Gate tecnici = solo `ele`; Contatti = address/phone/email; Link utili = solo `related_url`
- [ ] i18n chiave `Contatti` (7 lingue)
- [ ] `contact_phone` CSV → N voci + spec split + commit isolato `wm-phone`
- [ ] Spec sul componente promosso (gate / omitAddress)

## Rischi

- **`wm-phone` — blast radius**: solo `poi-properties` (+ Cypress). Commit isolato.
- **Gate tecnici solo `ele`**: i ~2.298 POI solo-indirizzo non aprono più “Dettagli
  tecnici” — voluto; l'indirizzo sta nei contatti.
- **`wm-email` multiplo**: 5 record, non affrontato.
- **Rollback cross-repo**: nessun `OPTIONS.*`; ordine wm-types → wm-core → app.
- **Confinamento branch RDO**: vedi Out of scope.

## Out of scope

- **wm-webapp (fase C)** — adozione popup / split EcPoi/UGC dopo merge.
- **Integrazione verso `develop`** — debito consapevole su branch RDO.
- **Fallback `taxonomy.poi_type` singolare** — deprecated lato backend.
- **Riscrittura `wm-related-urls`** / **`feature_image` in galleria** /
  **fix `wm-email` multiplo**.

## Moduli toccati

| File | Operazione |
|---|---|
| `projects/wm-core/src/poi-properties/` | **creato** |
| `projects/wm-core/src/address/address.component.ts` | **creato** |
| `projects/wm-core/src/utils/derive-poi-address.ts` (+ spec) | **creato** |
| `projects/wm-core/src/phone/` (split + multi) | modificato |
| `projects/wm-core/src/wm-core.module.ts` | declare/export |
| `projects/wm-core/src/localization/i18n/*` | label se toccate |
| `wm-types/src/feature.ts` | tipizzazione `address` / `address_link` |
