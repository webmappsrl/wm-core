> Ticket: oc:7646

# ECPOI filtro POI type — Related POI (wm-core) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement questo piano. È un singolo task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere `[wmMapPoisFilters]="poiFilterIdentifiers$|async"` al binding `wmMapTrackRelatedPois` in `geobox-map.component.html`.

**Architecture:** Modifica minimale al template — passa lo stesso observable già usato per i POI globali alla directive dei related POI.

**Tech Stack:** Angular template binding, async pipe.

**Dipendenza:** Questo piano dipende da map-core aggiornato con il nuovo `@Input() wmMapPoisFilters`. Eseguire dopo (o insieme a) il piano map-core.

---

### Task 1: Binding template

**Files:**
- Modify: `projects/wm-core/src/geobox-map/geobox-map.component.html`

- [ ] **Step 1.1: Aggiungi il binding**

In `projects/wm-core/src/geobox-map/geobox-map.component.html`, trova il blocco:

```html
    wmMapTrackRelatedPois
    [wmTrackRelatedPoiIcons]="icons$|async"
    [related-current-ec-poi-id]="currentRelatedPoiID$|async"
    (related-poi)="setCurrentRelatedPoi($event)"
```

Modifica in:

```html
    wmMapTrackRelatedPois
    [wmMapPoisFilters]="poiFilterIdentifiers$|async"
    [wmTrackRelatedPoiIcons]="icons$|async"
    [related-current-ec-poi-id]="currentRelatedPoiID$|async"
    (related-poi)="setCurrentRelatedPoi($event)"
```

- [ ] **Step 1.2: Verifica compilazione**

```bash
cd /Users/bongiu/Documents/apps/webmapp-app/core
npx ng build --configuration=development 2>&1 | grep -E "error" | head -10
```

Risultato atteso: nessun errore.
