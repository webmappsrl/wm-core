> Ticket: oc:8763

# Notes — Passaporto: attivazione per singolo cammino — app

## Divergenze dal piano, task per task

### Task 1 e 2 eseguiti insieme

Dopo il cambio di `PassportStageIndex` in `wm-types` (`pendingLayers` sostituito da
`enabledLayers`) il service non compilava finché anche `stageIndex$` non era adattato.

### Task 3 stato vuoto

Lo stato vuoto compare quando non c'è nessun timbro da mostrare (`stamps.length === 0`), non quando
`routes` è vuoto come scritto nel piano. Se il backend restituisse cammini assenti dalla config, con
la regola del piano il tab resterebbe bianco, senza timbri né messaggio.

### Altro

- **Dopo la review**: `visibleProgress` rinominato `visibleRoute`, perché restituisce una
  `PassportRoute`; colore `#d3cfc6` e misure dello stato vuoto spostati in variabili SCSS.
- `passport-progress.fixtures.ts` non è stato toccato: contiene risposte di `/progress`, non
  `PassportRoute`; le route di prova stanno negli spec.

## Bug trovati

Nessuno nel codice. Ambiente:
- installare le dipendenze in `wm-core/node_modules` per i test Karma rompe `ng serve` dell'app
  (`Module not found` su `@ionic/core` e `swiper`, `UntypedFormGroup` incompatibili): la cartella va
  rimossa e il server riavviato. È lo stesso problema già annotato in oc:8701.

## Decisioni

- Stato vuoto disegnato (variante A del design, https://claude.ai/artifact/V9Ri4byyXZaUUt8bheYgek):
  titolo nel colore primario dello shard, illustrazione verde dei timbri, testo che dice che il
  servizio non è attivo su nessun cammino e che dopo l'attivazione compariranno i timbri da
  completare.
- Regola di visibilità del dev: su un cammino acceso badge, anello e chip ci sono sempre, anche a 0
  tappe percorse; su uno spento niente.
- `validated_tracks` come mappa id → data (non solo id), così il chip mantiene «percorsa il …».
- Nessun fallback se il backend non manda `validated_tracks`: backend e app si rilasciano insieme.

## Follow-up

- Verifica funzionale nella webapp camminiditalia, che monta la variante di `home-layer` con badge e
  anello: fuori da questo ticket per scelta del dev.
- Il dettaglio legge ancora `/progress`, badge e timbri `/api/passport`: dopo una convalida i due
  conteggi possono differire fino alla rilettura successiva.
