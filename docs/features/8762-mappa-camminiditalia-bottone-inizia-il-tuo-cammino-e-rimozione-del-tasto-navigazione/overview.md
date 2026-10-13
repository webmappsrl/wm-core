> Ticket: oc:8762

# Mappa camminiditalia: bottone «Inizia il tuo cammino» — traduzioni

## Cosa cambia

Il testo «Inizia il tuo cammino», usato dal nuovo bottone sulla mappa dell'app camminiditalia, entra
nei file di traduzione di wm-core.

## Perché

Il bottone vive in webmapp-app (variante camminiditalia della pagina mappa), ma le traduzioni
dell'app stanno qui. Il resto del lavoro è descritto nell'overview omonima di webmapp-app.

## Requisiti

- [ ] Chiave `'Inizia il tuo cammino'` (chiave = testo italiano) in tutti e 7 i file di
  `localization/i18n/`: it, en, de, fr, es, pr, sq.
- [ ] Nessun'altra modifica a wm-core.

## Rischi

- Il submodule va committato e il suo riferimento aggiornato in webmapp-app, altrimenti la build
  dell'app mostra la chiave italiana in tutte le lingue.

## Out of scope

- Tutto il resto del ticket: sta in webmapp-app.

## Moduli toccati

- `projects/wm-core/src/localization/i18n/{it,en,de,fr,es,pr,sq}.ts`
