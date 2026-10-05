> Ticket: oc:8689

# Tradurre l'etichetta «Modalità di percorrenza» nella scheda percorso (Travel mode)

## Cosa cambia

Nella scheda di un percorso, l'etichetta sopra il selettore a piedi / in bici
(`wm-travel-mode`) passa dalla pipe `wmtrans` invece di essere scritta in italiano nel template.
La chiave «Modalità di percorrenza» viene aggiunta in tutti e sette i file di lingua di
`localization/i18n/`, così l'etichetta segue la lingua dell'app come le altre del blocco
(«Difficoltà», «Lunghezza», «Orario previsto»).

Testi per lingua:

| File | Testo |
|---|---|
| `it.ts` | Modalità di percorrenza |
| `en.ts` | Travel mode |
| `de.ts` | Fortbewegungsart |
| `fr.ts` | Mode de déplacement |
| `es.ts` | Modo de desplazamiento |
| `pr.ts` | Modo de deslocação |
| `sq.ts` | Mënyra e udhëtimit |

## Perché

Con l'app in inglese l'etichetta resta in italiano, mentre le etichette accanto sono già tradotte.
Il travel mode è stato acceso per Vivi Lama (oc:8608), che ha anche l'interfaccia in inglese, e la
guida inglese (oc:8685) mostra già «Travel mode» negli screenshot: l'app deve dire la stessa cosa.

## Requisiti

- [x] In `travel-mode.component.html` l'etichetta è `{{'Modalità di percorrenza'|wmtrans}}`.
- [x] La chiave `'Modalità di percorrenza'` esiste, non vuota, in tutti e sette i file di
      `localization/i18n/` (it, en, de, fr, es, pr, sq), con i testi della tabella sopra, accanto
      alle chiavi dello stesso blocco («Lunghezza», «Orario previsto»).
- [x] Verifica in locale sulla webapp puntata su Vivi Lama (`shardName: 'maphub'`, `appId: 2`):
      nel dettaglio di un percorso l'etichetta è «Modalità di percorrenza» in italiano e
      «Travel mode» in inglese.
- [ ] [UX] L'etichetta non viene troncata con i puntini in nessuna lingua: il testo più lungo
      (es/fr) va a capo o resta intero, senza rompere il layout del blocco.
      Verificato solo in it ed en: Vivi Lama non offre es/fr (vedi [notes.md](notes.md#task-2-verifica-manuale-su-vivi-lama)).

## Rischi

- **La chiave non combacia con quella dei file di lingua.** La ricerca di ngx-translate è esatta e
  case-sensitive, accento della «à» compreso: una differenza di un carattere lascia l'etichetta
  in italiano senza errori. Mitigazione: nessuno spec — uno spec sui file di lingua non leggerebbe
  il template, e in questa PR non girerebbe (la CI di `wm-core` non lancia i test). L'uguaglianza
  fra template e chiave, con la «à» accentata come vuole la grammatica, la conferma la verifica
  manuale nell'app in italiano e in inglese, che è obbligatoria.
- **L'app riceve il fix solo quando aggiorna il submodule.** Finché `webmapp-app` non sposta il
  puntatore di `wm-core`, nell'app l'etichetta resta in italiano. L'allineamento dei puntatori è
  dei dev, fuori da questo lavoro.
- [UX] **Testi più lunghi dell'italiano** (es «Modo de desplazamiento», fr «Mode de
  déplacement») possono andare a capo su schermi stretti: va guardato nella verifica.

## Out of scope

- Le altre etichette rimaste in italiano nel pannello del tipo di mappa («Tipo mappa», «Dati»,
  «Percorsi»).
- Il nome accessibile (`aria-label`) dei due pulsanti a piedi / in bici, che oggi hanno solo
  l'icona.
- L'aggiornamento del puntatore a `wm-core` in `wm-webapp` e in `webmapp-app`.
- Test automatici: la verifica di questa etichetta è manuale.

## Moduli toccati

Tutti nel repo `wm-core`:

- `projects/wm-core/src/travel-mode/travel-mode.component.html`
- `projects/wm-core/src/localization/i18n/{it,en,de,fr,es,pr,sq}.ts`

In `wm-webapp` solo `src/environments/environment.ts` per la verifica in locale, mai committato.
