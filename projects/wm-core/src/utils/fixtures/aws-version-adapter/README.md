> Ticket: oc:8998

# Fixture dell'adapter della traccia alla forma v1

Catturate il 23/11/2026 (le prime tre) e il 24/11/2026 (maphub e camminiditalia) e ridotte con `jq` a `type`, `geometry` (primi due punti) e alle
`properties` `id`, `name`, `taxonomies`, `taxonomy`, `taxonomy_where`, `taxonomyWheres` e
`related_pois` (solo il primo). Per GeoHub `taxonomy.activity[0].icon` tiene l'SVG vero.

| File | Fonte |
|---|---|
| `forestasdev-769-v1.json` | `https://forestas.dev.maphub.it/wmfe/forestasdev/tracks/v1/769.json` |
| `forestasdev-769-unversioned.json` | `https://forestas.dev.maphub.it/wmfe/forestasdev/tracks/769.json` |
| `geohub-100-unversioned.json` | `https://wmfe.s3.eu-central-1.amazonaws.com/geohub/tracks/100.json` |
| `maphub-2-unversioned.json` | `https://wmfe.s3.eu-central-1.amazonaws.com/maphub/tracks/2.json` (app 2, «Vivi Lama»): senza `taxonomies`, con `taxonomy.activity` e `taxonomy_where` |
| `camminiditalia-2-unversioned.json` | `https://wmfe.s3.eu-central-1.amazonaws.com/camminiditalia/tracks/2.json` (app 1): senza `taxonomies` né `taxonomy`, con `taxonomy_where` che porta `_source` |
