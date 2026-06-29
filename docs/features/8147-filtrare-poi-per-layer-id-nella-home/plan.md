> Ticket: oc:8147

# Plan — Filtrare i POI per layer ID nella home

Tutti i file sono nel submodule `wm-core` (`core/src/app/shared/wm-core/`).

---

## Task 1 — Aggiungere `filterFeaturesByLayerId()` in `utils.ts`

**File:** `projects/wm-core/src/store/features/ec/utils.ts`

Aggiungere dopo `filterFeatures()` la funzione:

```typescript
/**
 * Returns true if the feature collection uses layer-ID-based filtering
 * (i.e. at least one feature has a non-empty properties.layers array).
 */
export const hasLayerIdData = (features: WmFeature<Point | LineString>[]): boolean => {
  if (!features?.length) return false;
  return features.some(f => Array.isArray(f?.properties?.layers) && f.properties.layers.length > 0);
};

/**
 * Filters features by direct layer ID membership.
 * Falls back to returning all features if layerId is NaN.
 */
export const filterFeaturesByLayerId = (
  features: WmFeature<Point | LineString>[],
  layerId: number,
): WmFeature<Point | LineString>[] => {
  if (isNaN(layerId)) {
    console.warn('[filterFeaturesByLayerId] layerId is NaN — skipping layer ID filter');
    return features;
  }
  return features.filter(f => {
    const layers: number[] = f?.properties?.layers ?? [];
    return layers.includes(layerId);
  });
};
```

**Commit:** `feat(oc:8147): add filterFeaturesByLayerId and hasLayerIdData utils`

---

## Task 2 — Aggiornare `poisWhereFeatures` in `ec.selector.ts`

**File:** `projects/wm-core/src/store/features/ec/ec.selector.ts`

Aggiungere `currentEcLayer` agli import da `user-activity.selector`:

```typescript
import {
  inputTyped,
  filterTracks,
  filterTaxonomies,
  poiFilterIdentifiers,
  poisSelectedFilterIdentifiers,
  currentEcLayer,   // ← aggiungere
} from '@wm-core/store/user-activity/user-activity.selector';
```

Sostituire il selettore `poisWhereFeatures`:

```typescript
export const poisWhereFeatures = createSelector(
  allEcpoiFeatures,
  filterTaxonomies,
  currentEcLayer,
  (allEcPois, filter, layer) => {
    // Stage 1: taxonomy filter (invariato)
    const taxonomyFiltered = filterFeatures(allEcPois, filter);

    // Stage 2: layer ID filter (solo se layer selezionato e dati disponibili)
    if (layer == null) return taxonomyFiltered;
    if (!hasLayerIdData(allEcPois)) return taxonomyFiltered;

    const layerId = +layer.id;
    if (isNaN(layerId)) {
      console.warn(`[poisWhereFeatures] layer.id "${layer.id}" is not numeric — skipping layer ID filter`);
      return taxonomyFiltered;
    }

    return filterFeaturesByLayerId(taxonomyFiltered, layerId);
  },
);
```

Aggiungere `hasLayerIdData` e `filterFeaturesByLayerId` agli import da `./utils`:

```typescript
import {
  buildStats,
  calculateLayerFeaturesCount,
  filterFeatures,
  filterFeaturesByInputTyped,
  filterFeaturesByLayerId,   // ← aggiungere
  hasLayerIdData,             // ← aggiungere
} from './utils';
```

**Commit:** `feat(oc:8147): filter poisWhereFeatures by layer ID when properties.layers available`

---

## Task 3 — Aggiornare `calculateLayerFeaturesCount()` in `utils.ts`

**File:** `projects/wm-core/src/store/features/ec/utils.ts`

Sostituire la funzione esistente:

```typescript
export const calculateLayerFeaturesCount = (
  layers: ILAYER[],
  pois: WmFeature<Point>[],
  aggregationBucketsLayers: Bucket[],
) => {
  const layerFeaturesCount: LayerFeaturesCount = {};
  const useLayerIds = hasLayerIdData(pois);

  if (layers?.length > 0 && (pois?.length > 0 || aggregationBucketsLayers?.length > 0)) {
    layers.forEach(layer => {
      const layerId = layer.id;
      layerFeaturesCount[layerId] = {pois: 0, tracks: 0};

      let poisForLayer: WmFeature<Point>[];

      if (useLayerIds) {
        const numericId = +layerId;
        if (isNaN(numericId)) {
          console.warn(`[calculateLayerFeaturesCount] layer.id "${layerId}" is not numeric`);
          poisForLayer = [];
        } else {
          poisForLayer = pois.filter(poi => {
            const layers: number[] = poi.properties?.layers ?? [];
            return layers.includes(numericId);
          });
        }
      } else {
        // Fallback legacy: conteggio per taxonomy theme
        const layerTaxonomies = layer.taxonomy_themes;
        poisForLayer = pois.filter(poi => {
          const poiTaxonomies = poi.properties?.taxonomy?.theme ?? [];
          return layerTaxonomies?.some(taxonomy => poiTaxonomies.includes(taxonomy?.id)) ?? false;
        });
      }

      layerFeaturesCount[layerId].pois = poisForLayer.length;

      const layerBucket = aggregationBucketsLayers.find(bucket => bucket.key == layerId);
      if (layerBucket) {
        layerFeaturesCount[layerId].tracks = layerBucket.doc_count;
      }
    });
  }

  return layerFeaturesCount;
};
```

**Commit:** `feat(oc:8147): update calculateLayerFeaturesCount to use layer ID when available`

---

## Task 4 — Verifica manuale

1. Avviare l'app su `camminiditalia` (server nuovo con `properties.layers`)
2. Selezionare un layer dalla home → verificare che i POI nel tab "Punti di interesse" siano solo quelli effettivamente associati al layer
3. Verificare che il badge numerico del layer corrisponda al numero di POI nella lista
4. Aggiungere un filtro taxonomy manuale → verificare che filtra ulteriormente senza azzerare la lista
5. Deselezionare il layer → verificare che tutti i POI tornino visibili
6. Verificare su un'istanza legacy (server senza `properties.layers`) che il comportamento sia identico all'attuale
