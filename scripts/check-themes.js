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
 * funzionante; da quando i temi stanno qui, dà nove fogli — sei clienti — senza
 * personalizzazione.
 *
 * **Sta in wm-core e non nei due prodotti** perché il problema è di wm-core: è qui che i file vivono
 * e da qui che possono mancare. Tenerne una copia per prodotto avrebbe creato il terzo caso di
 * «due file gemelli che nessuno strumento tiene allineati», dopo `serve.js` e `lib/run.js`.
 * Entrambi i prodotti lo invocano con lo stesso percorso relativo alla propria radice di build:
 *
 *     node src/app/shared/wm-core/scripts/check-themes.js
 *
 * **I temi** li cerca rispetto a se stesso, non alla cartella da cui è lanciato. **Il manifest no**:
 * quello lo cerca in `process.cwd()`, perché è del prodotto e ogni prodotto ha il suo. Quindi lo
 * script va lanciato dalla radice di build del consumer — che è già la cwd di tutti i punti di
 * innesto, compreso il gulpfile che gira nella copia dell'istanza.
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

// L'elenco atteso sta dal lato di **chi consuma**, non qui.
//
// Prima stava in questo file, ed era inutile contro il caso che conta: se il submodule è pinnato
// indietro, il consumer si porta dietro sia i temi vecchi sia l'elenco vecchio, i due coincidono
// e il gate passa. Un elenco che viaggia insieme a ciò che controlla non controlla niente.
//
// Ora ogni prodotto dichiara nel proprio `theme-manifest.json` l'elenco che si aspetta di
// trovare qui. Non «i clienti che quel prodotto vuole servire»: deve **coincidere con questa
// cartella**, perché la voce di `assets` pubblica comunque tutto ciò che trova e i due prodotti
// servono gli stessi file — un tema in più fa fallire la build quanto uno in meno.
//
// Il file sta nella radice di build del consumer, che è già la cwd di tutti i punti di innesto —
// `prebuild`, gli script di deploy e Surge, il passo di preview, il gulpfile che gira nella copia
// dell'istanza — quindi lo spostamento dell'elenco non ha richiesto di toccarne nessuno. Dopo, e
// per un'altra ragione, quasi tutti sono passati a `npm run check-themes` così da scrivere il
// percorso una volta per repo; **il gulpfile no**, e non può: `npm run` sposta la cwd alla radice
// del pacchetto, e lì il gate guarderebbe la cartella sbagliata.
//
// Aggiungere un cliente tocca **quattro posti**: il file qui, l'elenco in
// `.github/workflows/test.yml`, il manifest di ciascuno dei due prodotti — poi il bump del pin. Se
// il pin resta indietro, il manifest ne chiede dieci e se ne trovano nove: il gate si ferma, ed è
// il suo lavoro. (oc:8613)
const MANIFEST = path.join(process.cwd(), 'theme-manifest.json');

/**
 * `{themes}` se il manifest è leggibile, `{error}` altrimenti. Due errori diversi — il file che
 * manca e il file illeggibile — vogliono due messaggi diversi, e tenerli distinti come `null` e
 * `undefined` li faceva fondere al primo `== null` che qualcuno avesse scritto.
 */
function leggiManifest() {
  if (!fs.existsSync(MANIFEST)) return {error: 'assente'};
  let dichiarati;
  try {
    dichiarati = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  } catch (e) {
    return {error: 'illeggibile'};
  }
  return Array.isArray(dichiarati) ? {themes: dichiarati} : {error: 'illeggibile'};
}

const manifest = leggiManifest();

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

if (manifest.error === 'illeggibile') {
  console.error('');
  console.error(`✖ ${MANIFEST} non è leggibile come elenco JSON.`);
  console.error('  Deve contenere un array di percorsi: ["geohub/29.css", "forestas/1.css", …]');
  console.error('');
  process.exit(1);
}

if (manifest.error === 'assente') {
  console.error('');
  console.error(`✖ Manca ${MANIFEST}: questo prodotto non dichiara i temi che deve servire.`);
  console.error('');
  console.error("  Senza quell'elenco il controllo non può accorgersi di un pin del submodule rimasto");
  console.error('  indietro, che è il caso per cui esiste.');
  console.error('');
  console.error('  **Non copiare i temi che trovi qui adesso**: se il pin è indietro certificheresti');
  console.error('  proprio lo stato sbagliato. Prendi il file da `develop`, oppure dal manifest');
  console.error("  dell'altro prodotto, che deve essere identico a questo.");
  console.error('');
  process.exit(1);
}

const attesi = manifest.themes;
const mancanti = attesi.filter(t => !trovati.includes(t));
const inattesi = trovati.filter(t => !attesi.includes(t));

if (mancanti.length > 0) {
  const quanti = mancanti.length === 1 ? 'Manca 1 tema' : `Mancano ${mancanti.length} temi`;
  console.error('');
  console.error(`✖ ${quanti} su ${attesi.length} dichiarati: quel cliente andrebbe in produzione senza il proprio CSS.`);
  console.error('');
  console.error(`  Dichiarati in: ${MANIFEST}`);
  console.error(`  Cercati in:    ${TEMI}`);
  console.error(`  Mancanti:      ${mancanti.join(', ')}`);
  console.error('');
  console.error('  Causa più probabile: il pin di wm-core è indietro rispetto al commit che ha');
  console.error('  aggiunto quel cliente. Allinealo. Se invece il tema è stato tolto di proposito,');
  console.error('  va tolto anche dal manifest — e ricordati che i deploy non cancellano sul');
  console.error('  server: il file resta in produzione finché non lo rimuovi a mano.');
  console.error('');
  process.exit(1);
}

if (inattesi.length > 0) {
  const quanti = inattesi.length === 1 ? "C'è 1 tema" : `Ci sono ${inattesi.length} temi`;
  console.error('');
  console.error(`✖ ${quanti} che il manifest non dichiara: ${inattesi.join(', ')}`);
  console.error('');
  console.error(`  Un cliente nuovo va dichiarato nel manifest, ${MANIFEST}, altrimenti il gate`);
  console.error('  non si accorgerà se un domani sparisce.');
  console.error('');
  process.exit(1);
}

console.log(`[check-themes] ${trovati.length} temi per istanza trovati, tutti dichiarati nel manifest.`);
