> Ticket: oc:8589

# Bug grafico: linea separatrice logo/nome incoerente nella home dei layer

## Cosa cambia

Il separatore verticale (`::before` su `.wm-box-title`) nella card della home layer di Cammini
d'Italia (`home-layer.component.camminiditalia.scss`) passa da un'altezza calcolata come offset
fisso (`top: 30px; bottom: 30px`) su un contenitore ad altezza automatica, a un'altezza fissa
indipendente dal numero di righe del titolo (1 o 2+ righe), centrata verticalmente.

## Perché

Davide ha segnalato che su "Cammino Balteo" la lineetta tra logo e nome appare ridotta rispetto
ad altri cammini con logo. Diagnosi confermata nel codice attuale
(`home-layer.component.camminiditalia.scss:70-82`): il separatore non ha un'altezza fissa, ma
dipende dall'altezza auto del blocco titolo, che a sua volta dipende dal wrapping del testo — un
titolo su una riga produce un separatore più corto di uno su due righe.

Verifica numerica sul CSS attuale: `.wm-box-title` ha `line-height: 31px` e `padding: 16px 16px
16px 12px`. Con `top: 30px; bottom: 30px`, un titolo su una riga (altezza box ≈ 63px) produce un
separatore di ≈3px — praticamente invisibile — mentre un titolo su due righe (altezza box ≈94px)
produce ≈34px. Questo spiega esattamente la differenza percepita da Davide.

Non è legato al logo in sé (dimensioni/proporzioni del logo verificate non influenti, colonna a
larghezza fissa 56px). Il file toccato è una variante specifica di questo shard: nessun altro
progetto Webmapp ha un file analogo, quindi il fix non ha impatto cross-progetto.

## Requisiti

- [ ] In `.wm-box-title::before` (`home-layer.component.camminiditalia.scss`), rimuovere
  esplicitamente `top: 30px; bottom: 30px` e sostituirli con `height: 40px; top: 50%; transform:
  translateY(-50%)` — 40px è scelto perché resta sotto l'altezza minima del box titolo su una
  riga (≈63px, con `line-height: 31px` + `padding: 16px` sopra e sotto), quindi il separatore non
  può mai sporgere oltre i bordi della riga, indipendentemente dal numero di righe del titolo
- [ ] Verificare visivamente su "Cammino Balteo" (titolo su una riga) e su un cammino con titolo
  su due righe che il separatore risulti della stessa altezza in entrambi i casi
- [ ] Verificare anche con un titolo molto lungo (3+ righe potenziali) che il comportamento resti
  corretto e che le vecchie proprietà `top`/`bottom` non siano rimaste a confliggere con quelle
  nuove

## Rischi

Nessun rischio cross-progetto: il file è una variante specifica di Cammini d'Italia (`fileReplacements`
via `home-layer.component.camminiditalia.ts`), nessun altro shard la condivide. Fix confinato a
una singola regola CSS (il selettore `::before` con `:has()`), nessun impatto su altri elementi
della card (foto sfondo, cuoricino preferiti, layout logo).

**Deploy:** questo shard ha una pipeline di deploy dedicata (`deploy-to-web-camminiditalia`),
separata da quella generica. Un eventuale hotfix/rollback fatto con il comando di deploy sbagliato
(`deploy-to-web --configuration=camminiditalia`) pubblicherebbe il template Cammini d'Italia a
tutti i clienti — va usato sempre lo script dedicato, mai `--configuration=<shard>` sul deploy
generico (vincolo già in `CLAUDE.md` → Regole del repo).

**Rischi minori accettati, senza azione:** il selettore CSS (`:has()` a 4 livelli) è accoppiato
alla struttura DOM di `home-layer` in `wm-core` — un refactor del markup condiviso lo romperebbe
in silenzio, ma è un rischio preesistente del pattern per-shard, non introdotto da questo fix.
Nessun test automatico di regressione visiva viene aggiunto. Zoom/font di accessibilità che
alterano il `line-height` reale non sono coperti dalla verifica manuale. Se lo shard è distribuito
anche via app nativa, un rollback lì richiede i tempi di review store, non solo un `git revert`.

## Out of scope

Il caso "nessun logo" (nessun separatore mostrato, gestito da `:has(> wm-img.wm-home-layer-logo-overlay)`)
resta invariato. Nessuna priorità assegnata al ticket, su richiesta esplicita del dev. Nessuna
modifica ad altri elementi della card oltre al separatore.

## Moduli toccati

`webmapp-app` → submodule `wm-core` →
`projects/wm-core/src/home/home-layer/home-layer.component.camminiditalia.scss`
