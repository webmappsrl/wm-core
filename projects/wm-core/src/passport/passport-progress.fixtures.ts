/**
 * Risposte del backend camminiditalia a `GET /api/layer/{layer}/progress` (oc:8676), solo per gli
 * spec. Sono le risposte reali del DB locale del 01/10/2026 (utente 4), tranne
 * `LAYER_40_GPS_PARTIAL`, costruita a mano: il backend non produce ancora valori di `progress`
 * intermedi (oc:8165).
 */

/** Cammino Grande di Celestino: 6 tappe validate su 13, con la «Tappa 09 Variante». */
export const LAYER_40_PROGRESS = {
  "layer_id": 40,
  "validated": 6,
  "total": 13,
  "percentage": 46,
  "completed": false,
  "km_validated": 39.5,
  "km_total": 105.0,
  "tracks": [
    {
      "id": 203,
      "name": {
        "it": "Cammino Grande di Celestino - Tappa 06: Pacentro - Caramanico Terme"
      },
      "distance": 19.5,
      "status": "validated",
      "progress": 100,
      "validated_at": "2026-09-30T14:45:55+00:00",
      "source": "manual"
    },
    {
      "id": 215,
      "name": {
        "it": "Cammino Grande di Celestino - Tappa 11: San Martino sulla Maruccina - Crecchio"
      },
      "distance": 0.0,
      "status": "not_validated",
      "progress": 0,
      "validated_at": null,
      "source": null
    },
    {
      "id": 216,
      "name": {
        "it": "Cammino Grande di Celestino - Tappa 12: Crecchio - Ortona"
      },
      "distance": 14.0,
      "status": "not_validated",
      "progress": 0,
      "validated_at": null,
      "source": null
    },
    {
      "id": 218,
      "name": {
        "it": "Cammino Grande di Celestino - Tappa 05: Badia - Pacentro"
      },
      "distance": 0.0,
      "status": "validated",
      "progress": 100,
      "validated_at": "2026-09-30T14:45:55+00:00",
      "source": "manual"
    },
    {
      "id": 222,
      "name": {
        "it": "Cammino Grande di Celestino - Tappa 08: Decontra - Macchie di Coco"
      },
      "distance": 22.0,
      "status": "not_validated",
      "progress": 0,
      "validated_at": null,
      "source": null
    },
    {
      "id": 309,
      "name": {
        "it": "Cammino Grande di Celestino - Tappa 03:  Castelvecchio Subequo - Raiano"
      },
      "distance": 0.0,
      "status": "validated",
      "progress": 100,
      "validated_at": "2026-09-30T14:45:55+00:00",
      "source": "manual"
    },
    {
      "id": 369,
      "name": {
        "it": "Cammino Grande di Celestino - Tappa 01:  L'Aquila - Fontecchio"
      },
      "distance": 0.0,
      "status": "validated",
      "progress": 100,
      "validated_at": "2026-09-30T14:45:55+00:00",
      "source": "manual"
    },
    {
      "id": 439,
      "name": {
        "it": "Cammino Grande di Celestino - Tappa 07: Caramanico Terme - Decontra"
      },
      "distance": 14.0,
      "status": "not_validated",
      "progress": 0,
      "validated_at": null,
      "source": null
    },
    {
      "id": 489,
      "name": {
        "it": "Cammino Grande di Celestino - Tappa 09: Macchie Di Coco - Serramonacesca"
      },
      "distance": 15.5,
      "status": "not_validated",
      "progress": 0,
      "validated_at": null,
      "source": null
    },
    {
      "id": 704,
      "name": {
        "it": "Cammino Grande di Celestino - Tappa 04: Raiano - Badia"
      },
      "distance": 0.0,
      "status": "validated",
      "progress": 100,
      "validated_at": "2026-09-30T14:45:55+00:00",
      "source": "manual"
    },
    {
      "id": 708,
      "name": {
        "it": "Cammino Grande di Celestino - Tappa 10: Serramonacesca - San Martino sulla Maruccina"
      },
      "distance": 0.0,
      "status": "not_validated",
      "progress": 0,
      "validated_at": null,
      "source": null
    },
    {
      "id": 710,
      "name": {
        "it": "Cammino Grande di Celestino - Tappa 02: Fontecchio - Castelvecchio Subequo"
      },
      "distance": 20.0,
      "status": "validated",
      "progress": 100,
      "validated_at": "2026-09-30T14:45:55+00:00",
      "source": "manual"
    },
    {
      "id": 712,
      "name": {
        "it": "Cammino Grande di Celestino - Tappa 09 Variante: Macchie di Coco - Serramonacesca"
      },
      "distance": 0.0,
      "status": "not_validated",
      "progress": 0,
      "validated_at": null,
      "source": null
    }
  ]
};

/** Il Cammino dei Tre Villaggi: 3 tappe non validate, senza distanza nei dati. */
export const LAYER_63_PROGRESS = {
  "layer_id": 63,
  "validated": 0,
  "total": 3,
  "percentage": 0,
  "completed": false,
  "km_validated": 0.0,
  "km_total": 0.0,
  "tracks": [
    {
      "id": 522,
      "name": {
        "it": "Il Cammino dei tre villaggi - Tappa 03: Blera – Villa San Giovanni"
      },
      "distance": 0.0,
      "status": "not_validated",
      "progress": 0,
      "validated_at": null,
      "source": null
    },
    {
      "id": 608,
      "name": {
        "it": "Il Cammino dei Tre Villaggi - Tappa 02: Barbarano Romano – Blera"
      },
      "distance": 0.0,
      "status": "not_validated",
      "progress": 0,
      "validated_at": null,
      "source": null
    },
    {
      "id": 611,
      "name": {
        "it": "Il Cammino dei Tre Villaggi - Tappa 01: Villa San Giovanni – Barbarano Romano"
      },
      "distance": 0.0,
      "status": "not_validated",
      "progress": 0,
      "validated_at": null,
      "source": null
    }
  ]
};

/** Un layer senza tappe. */
export const LAYER_30_PROGRESS = {
  "layer_id": 30,
  "validated": 0,
  "total": 0,
  "percentage": 0,
  "completed": false,
  "km_validated": 0.0,
  "km_total": 0.0,
  "tracks": []
};

/** Come `LAYER_40_PROGRESS`, con la tappa 216 percorsa al 62% via GPS. Costruita a mano. */
export const LAYER_40_GPS_PARTIAL = {
  ...LAYER_40_PROGRESS,
  tracks: LAYER_40_PROGRESS.tracks.map(t => (t.id === 216 ? {...t, progress: 62} : t)),
};
