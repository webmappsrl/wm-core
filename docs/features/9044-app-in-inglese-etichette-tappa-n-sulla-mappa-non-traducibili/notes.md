> Ticket: oc:9044 (doppione oc:9048)

# Notes — «Tappa N» tradotto sulla mappa, parte wm-core e dati

## Deviazioni dal piano

Nessuna sul codice. Il piano di oc:9045 (dati) è stato eseguito in locale prima del dev di oc:9044,
per far approvare a Rubens il locale dei quattro ticket insieme.

## Bug trovati

- **Primo cambio di lingua senza ridisegno** (review interna, ciclo 1). Con un
  `filter(lang => lang != null)` dopo `startWith(currentLang)`, alla prima visita (nessun `wm-lang`
  in localStorage, quindi nessun `use()` e `currentLang` undefined) `skip(1)` scartava il primo cambio
  reale scelto dall'utente: sulla mappa restava «Tappa 5» fino a un pan o uno zoom. Tolto il
  `filter`: `skip(1)` scarta solo il valore iniziale. Nella verifica in locale non era emerso perché
  il browser aveva già `wm-lang`.

## Decisioni

- Le traduzioni dei `ref` sono dati nel tab Translations dell'App di camminiditalia
  (`translations_en`, `translations_it` con valore uguale alla chiave), non nei file `i18n/*.ts`.
  Chiavi generate dai dati di produzione (157 valori distinti il 25/11/2026), controllate con
  `check-ref-translations.py` (LLM_MD).
- In locale `translations_it`/`translations_en` dell'App erano array di caratteri (copia di maggio
  2026): ricostruiti prima di aggiungere le chiavi. In produzione sono mappe corrette.
- Su dev c'erano due chiavi di prova nel tab Translations (`difficulty`, `Medio- Alta`) che
  sostituivano l'etichetta della riga della difficoltà: tolte su richiesta di Rubens (25/11/2026).
- `_updateMap()` chiamato due volte per ogni emissione di `refreshLayer$` (setter di
  `wmMapLayerRefresh` più `ngOnChanges`): comportamento già presente con i filtri, non cambiato.
- L'ordine di `[wmMapTranslationCallback]` nel template di `wm-geobox-map` non è stato spostato: il
  binding era già condiviso da più direttive prima di questo lavoro.

## Follow-up

- `ref` traducibile nel backend: secondo passo deciso allo scrum del 25/11/2026.
- `ref` aggiunti o cambiati dal cliente dopo l'inserimento delle chiavi non sono tradotti finché non
  si aggiungono al tab Translations.
