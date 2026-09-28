# Temi per istanza

Un file per app: `<shardName>/<appId>.css`. Lo carica `meta/meta.component.ts:50`, che costruisce
`theme/<shardName>/<appId>.css` e lo inietta come `<link id="client-theme">` in fondo al `<head>`.

L'URL è **costruito, non dichiarato**: nessuna build referenzia questi file, quindi **a runtime**
un tema che manca non dà nessun errore — l'app riceve un 404 e resta senza personalizzazione. È il
motivo per cui esiste il gate descritto sotto: prima di oc:8613 niente se ne accorgeva, e un deploy
senza il CSS del cliente era verde.

**Un elenco però ora c'è, ed è in quattro posti**: questa cartella, l'elenco nel workflow
`.github/workflows/test.yml` di questo repo, e il `theme-manifest.json` di ciascuno dei due
prodotti. Serve proprio perché l'URL è costruito: senza, nessuno saprebbe distinguere «questa app
non ha un tema» da «il tema c'è ma il pin del submodule è indietro». **Il workflow ne controlla
due**: se questa cartella e il suo elenco divergono, la PR di wm-core diventa rossa. **I due
manifest no**, perché stanno in altri repo — se ne dimentichi uno, te ne accorgi quando la build di
quel prodotto si ferma (oc:8613).

**Cosa dichiara il manifest.** Non «i clienti che quel prodotto vuole servire»: deve **coincidere
con questa cartella**. Un tema in più rispetto al manifest fa fallire la build, e uno in meno pure,
perché la voce di `assets` pubblica comunque tutto quello che trova — i due prodotti servono gli
stessi nove file. Il manifest è quindi una copia dell'elenco tenuta **dal lato del consumer**, ed è
lì e non qui perché solo da lì si può dire «il tuo pin è indietro».

Aggiungere un cliente: il file qui, l'elenco nel workflow, i due manifest, il bump dei pin.
Dismetterne uno: gli stessi quattro posti, più il file da togliere **a mano dal server** — vedi
sotto.

**Il 404 vale per un'app nuova, non per un tema che viene tolto.** I deploy dei due prodotti copiano
sopra quello che trovano e non cancellano niente. Non è una differenza fra i prodotti: **entrambi
usano sia `scp` sia `rsync`**, a seconda dello script, e **nessuno dei due passa `--delete`**:

| | `scp` | `rsync` senza `--delete` |
|---|---|---|
| `wm-webapp` | `deploy-default.js`, `deploy-cai` | `deploy-camminiditalia.js` |
| `webmapp-app` | `deploy-cai-to-web`, `deploy-to-web-verbose`, `deploy-to-web-assets` | `deploy-to-web-default.js`, `deploy-to-web-camminiditalia.js` |

Quindi cancellare un file da qui **non lo toglie dalla produzione**: il cliente continua a vedere
il proprio CSS finché qualcuno non rimuove il file dal server a mano. Disattivare un tema è due
operazioni, non una.

`--delete` è stato valutato e **rimandato** (oc:8613): su un percorso sbagliato cancella quello che
trova, e va scritto e provato a parte.

Stanno qui, e non nei due prodotti, perché la stessa app deve vedersi allo stesso modo sulla webapp
e sull'app: prima `wm-webapp/src/theme/` e `webmapp-app/core/src/theme/` ne tenevano insiemi
disgiunti, e la stessa istanza poteva avere il suo CSS su una piattaforma sola — è il caso di Ville
e Giardini Medicei (75), che ce l'aveva solo sull'app.

Entrambi i consumer li pubblicano con una voce di `assets` in `angular.json` che punta a questa
cartella con `output: "theme"`, lo stesso schema già usato per `map-core/src/assets`.

**Attenzione quando si rinomina un selettore o una classe di un componente condiviso**: questi file
puntano ai nostri nomi e non sono referenziati da nessuna build, quindi nessun compilatore, test o
lint segnalerà il drift. Dopo una rinomina, cercare il vecchio nome qui dentro.

## Sei file su nove sono copie, e vanno cambiati insieme

Non è un refuso: due clienti hanno lo stesso `appId` su shard diversi, quindi lo stesso CSS va
servito sotto più percorsi. Finché i file stavano in due repo la duplicazione era invisibile; qui è
a vista, e nessuno strumento la tiene allineata.

| md5 | File | Cliente |
|---|---|---|
| `3a957539` | `forestas/1.css`, `forestasdev/1.css`, `forestasuat/1.css`, `geohub/32.css` | Forestas sui tre shard, più Sardegna Sentieri |
| `d0bb0542` | `camminiditalia/1.css`, `camminiditaliadev/1.css` | Cammini d'Italia, produzione e dev |
| `dd6ed824` | `geohub/29.css` | Federazione Italiana Escursionismo |
| `99198ac4` | `geohub/33.css` | Sentieri CAI Parma |
| `2431151d` | `geohub/75.css` | Ville e Giardini Medicei |

**Una correzione per Forestas va scritta quattro volte**, una per Cammini d'Italia due. Dopo averla
fatta, verificare che gli md5 dei file di una stessa riga tornino a coincidere:

```bash
md5 -q projects/wm-core/src/assets/theme/*/*.css | sort | uniq -c
```

Un `@import url('../forestas/1.css')` nei tre derivati toglierebbe la duplicazione, ed è stato
valutato e scartato (oc:8613): aggiunge una richiesta bloccante, e se quella fallisce il cliente
perde **tutto** il proprio CSS invece di una riga. La copia è il guasto meno grave dei due.

## L'icon font: l'alias risolve il nome, non i glifi

I due prodotti chiamano la propria icon font con nomi diversi — `wm` in `wm-webapp`, `webmapp` in
`webmapp-app` — e un tema scritto guardando un prodotto usa il nome che conosce. Sotto oc:8613 ognuno
ha aggiunto un alias `@font-face` per l'altro nome, così la famiglia risolve da entrambe le parti.

**L'alias fa risolvere il nome, non allinea le mappe dei glifi.** I due file sono diversi — 1204
codepoint nella webapp, 241 nell'app, 241 in comune — e di quelli in comune **quattordici puntano a
icone diverse**:

| Codepoint | `wm-webapp` | `webmapp-app` |
|---|---|---|
| `\e995` | `icon-alpine-hut` | `icon-compass-outline` |
| `\e998` | `icon-alpine-hut-cai` | `icon-map-outline` |
| `\e9a2` | `icon-america-football-15` | `icon-person-outline` |
| `\e9a3` | `icon-amusement-park-15` | `icon-pin-distance-line` |
| `\e9a7` | `icon-aquarium-15` | `icon-swimming` |
| `\e9db` | `icon-adults-15` | `icon-wheelchair` |
| `\e9ed` | `icon-alpinism-15` | `icon-binoculars` |
| `\e9ee` | `icon-art-gallery-15` | `icon-restaurant` |
| `\e9ef` | `icon-attraction-15` | `icon-temples` |
| `\e9f0` | `icon-autumn-15` | `icon-train` |
| `\e984` `\e992` `\e993` `\e994` | nomi parlanti | `icon-uniE98…`, senza nome |

Il conteggio si rifà così, ed è il modo per accorgersi se un aggiornamento di una delle due font
allarga l'elenco:

```bash
# per ciascun file: .icon-nome:before { content: '\eXXX' } → mappa codepoint → nome
grep -oE "\.[a-z0-9-]+:before \{ *content: '\\\\[0-9a-f]+'" <style.css>
```

Oggi l'unico codepoint che un tema attraversa davvero è `\e985` (`icon-fill-arrow-right`), che nei
due font è **la stessa icona**: per questo l'alias funziona. Ma ha cambiato il modo di sbagliare —
prima un nome sconosciuto non rendeva niente, e si vedeva; adesso rende **un'icona sbagliata e
plausibile**, che in review passa.

Quindi: **un tema che chiede un'icona per nome va verificato su entrambi i prodotti**, non solo su
quello per cui è stato scritto. La soluzione vera — una sola font condivisa qui, o lo stesso nome
di famiglia nei due prodotti — è un follow-up: tocca gli asset, i riferimenti e la build di
entrambi.
