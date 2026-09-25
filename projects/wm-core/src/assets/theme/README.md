# Temi per istanza

Un file per app: `<shardName>/<appId>.css`. Lo carica `meta/meta.component.ts:50`, che costruisce
`theme/<shardName>/<appId>.css` e lo inietta come `<link id="client-theme">` in fondo al `<head>`.

L'URL è **costruito, non dichiarato**: un'app senza il suo file riceve un 404 e resta senza
personalizzazione. Non c'è nessun elenco da tenere aggiornato, e non c'è nessun errore quando il
file manca.

Stanno qui, e non nei due prodotti, perché la stessa app deve vedersi allo stesso modo sulla webapp
e sull'app: prima `wm-webapp/src/theme/` e `webmapp-app/core/src/theme/` ne tenevano insiemi
disgiunti, e la stessa istanza poteva avere il suo CSS su una piattaforma sola — è il caso di Ville
e Giardini Medicei (75), che ce l'aveva solo sull'app.

Entrambi i consumer li pubblicano con una voce di `assets` in `angular.json` che punta a questa
cartella con `output: "theme"`, lo stesso schema già usato per `map-core/src/assets`.

**Attenzione quando si rinomina un selettore o una classe di un componente condiviso**: questi file
puntano ai nostri nomi e non sono referenziati da nessuna build, quindi nessun compilatore, test o
lint segnalerà il drift. Dopo una rinomina, cercare il vecchio nome qui dentro.
