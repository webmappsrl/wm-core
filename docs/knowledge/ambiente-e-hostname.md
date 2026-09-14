# Riconoscimento dell'ambiente dall'hostname

## Come funziona oggi

Lo shard si ricava dall'hostname con una regex che accetta un numero variabile di parti nel dominio, grazie al gruppo `(?:\.[^.]+)+` al posto di una sequenza di gruppi opzionali fissi. Copre quindi anche i domini di anteprima come `pr-N.surge.sh` senza modifiche.

## Perché così

- **Parti variabili invece di gruppi opzionali** (oc:8031): con i gruppi fissi la regex andava toccata ad ogni nuovo provider o variante di dominio. Con le parti variabili non serve più.
- **Lo spec verifica la regex privata via `(service as any)`** (oc:8031): la proprietà resta `private`, e una guard `expect(regex).toBeDefined()` intercetta i rename silenziosi — senza quella, un rename farebbe passare il test su `undefined`.

## Debito noto

**`_assignApi()` va in crash se `shardName` non è presente in `environment.shards`** (oc:8031). È un rischio preesistente, non introdotto da quel lavoro e non affrontato lì: va tracciato in un ticket dedicato.
