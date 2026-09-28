#!/usr/bin/env node
/**
 * Ferma la build se i temi per istanza non ci sono (oc:8613).
 *
 * I CSS personalizzati dei clienti vivono qui, sotto
 * `projects/wm-core/src/assets/theme/<shard>/<appId>.css`, e gli `angular.json` dei due prodotti li
 * pubblicano con una voce di `assets`. Il `<link>` che li carica lo costruisce `meta.component.ts` a
 * runtime, quindi **niente li referenzia a compile-time**: se la cartella è vuota o assente, la glob
 * non trova nulla, non protesta, e la build riesce. Il risultato è un deploy in cui tutte le istanze
 * personalizzate perdono il proprio CSS senza un solo messaggio.
 *
 * Il caso concreto che ha motivato il controllo: il submodule è pinnato a un commit precedente alla
 * creazione della cartella — condizione normale finché le PR di wm-core non sono mergiate, perché i
 * pin si aggiornano dopo il merge. Prima di oc:8613 un pin indietro dava codice vecchio ma
 * funzionante; da quando i temi stanno qui, dà nove clienti senza personalizzazione.
 *
 * **Sta in wm-core e non nei due prodotti** perché il problema è di wm-core: è qui che i file vivono
 * e da qui che possono mancare. Tenerne una copia per prodotto avrebbe creato il terzo caso di
 * «due file gemelli che nessuno strumento tiene allineati», dopo `serve.js` e `lib/run.js`.
 * Entrambi i prodotti lo invocano con lo stesso percorso relativo alla propria radice di build:
 *
 *     node src/app/shared/wm-core/scripts/check-themes.js
 *
 * I temi li cerca rispetto a se stesso, non alla cartella da cui è lanciato, quindi funziona da
 * qualunque cwd.
 *
 * Nota sul caso limite: se il submodule è così indietro da non contenere nemmeno questo script,
 * `node` esce comunque diverso da zero con «Cannot find module …/wm-core/scripts/check-themes.js» —
 * che nomina il percorso dentro il submodule ed è quindi un messaggio ancora leggibile. La build si
 * ferma in entrambi i casi: è l'unica cosa che conta.
 */
const fs = require('fs');
const path = require('path');

const TEMI = path.join(__dirname, '..', 'projects/wm-core/src/assets/theme');

function trova(dir) {
  if (!fs.existsSync(dir)) return null;
  return fs
    .readdirSync(dir, {withFileTypes: true})
    .filter(e => e.isDirectory())
    .flatMap(e =>
      fs
        .readdirSync(path.join(dir, e.name))
        .filter(f => f.endsWith('.css'))
        .map(f => `${e.name}/${f}`),
    );
}

const trovati = trova(TEMI);

// L'elenco atteso, esplicito. Contare «almeno uno» non basta: il caso che si ripete non e' la
// cartella vuota ma il pin indietro di un commit, cioe' un insieme *parziale* — chi aggiunge il
// decimo cliente e non allinea il pin trova nove temi, legge «nove trovati» e lo manda in
// produzione senza il suo CSS. Aggiungere un cliente richiede quindi una riga qui: e' voluto,
// perche' e' l'unico punto in cui quell'aggiunta viene dichiarata invece che dedotta. (oc:8613)
const ATTESI = [
  'camminiditalia/1.css',
  'camminiditaliadev/1.css',
  'forestas/1.css',
  'forestasdev/1.css',
  'forestasuat/1.css',
  'geohub/29.css',
  'geohub/32.css',
  'geohub/33.css',
  'geohub/75.css',
];

if (trovati == null || trovati.length === 0) {
  console.error('');
  console.error("✖ I temi per istanza non ci sono: la build produrrebbe un'app senza i CSS dei clienti.");
  console.error('');
  console.error(`  Cercati in: ${TEMI}`);
  console.error(
    trovati == null ? '  La cartella non esiste.' : '  La cartella esiste ma non contiene nessun .css.',
  );
  console.error('');
  console.error('  Causa più probabile: il submodule wm-core è a un commit che precede oc:8613.');
  console.error('  Verifica con:  git -C src/app/shared/wm-core log --oneline -1');
  console.error('  e allinealo al commit della PR di wm-core prima di buildare.');
  console.error('');
  process.exit(1);
}

const mancanti = ATTESI.filter(t => !trovati.includes(t));
const inattesi = trovati.filter(t => !ATTESI.includes(t));

if (mancanti.length > 0) {
  console.error('');
  const q = mancanti.length === 1 ? 'Manca 1 tema' : `Mancano ${mancanti.length} temi`;
  console.error(`✖ ${q} per istanza su ${ATTESI.length}: quel cliente andrebbe in produzione senza il proprio CSS.`);
  console.error('');
  console.error(`  Cercati in: ${TEMI}`);
  console.error(`  Mancanti:   ${mancanti.join(', ')}`);
  console.error('');
  console.error('  Se il submodule wm-core è indietro, allinea il pin.');
  console.error("  Se invece un tema è stato tolto di proposito, va tolto anche dall'elenco ATTESI in questo script.");
  console.error('');
  process.exit(1);
}

if (inattesi.length > 0) {
  console.error('');
  const q = inattesi.length === 1 ? "C'è 1 tema" : `Ci sono ${inattesi.length} temi`;
  console.error(`✖ ${q} che l'elenco ATTESI non conosce: ${inattesi.join(', ')}`);
  console.error('');
  console.error("  Un tema nuovo va dichiarato qui, altrimenti la guardia non si accorgerà se un domani sparisce.");
  console.error('');
  process.exit(1);
}

console.log(`[check-themes] ${trovati.length} temi per istanza trovati: ${trovati.join(', ')}`);
