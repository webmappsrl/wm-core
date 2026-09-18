# Isolamento del TestBed tra spec file

## Come funziona oggi

Ogni spec che usa il `TestBed` chiama `TestBed.resetTestingModule()` due volte: all'inizio di ogni `beforeEach` che configura il modulo, e in `afterEach`. Il reset preventivo serve perché Jasmine randomizza l'ordine dei file, quindi non si può sapere in che stato l'ha lasciato lo spec precedente.

Chi usa campi `static` deve azzerarli a mano in `afterEach`: il reset del TestBed non li tocca. `wmtrans.pipe.spec.ts` lo fa per `WmTransPipe.sub` (unsubscribe + `null`) e per il `Set` in `cdrs`.

La configurazione Karma è quella del progetto, non il default: `angular.json` dichiara `"karmaConfig": "karma.conf.js"` nel target `test`, e `karma.conf.js` definisce il launcher `ChromeHeadlessNoSandbox` (`--no-sandbox`, `--disable-gpu`) per la CI.

## Perché così

- **Senza reset i test fallivano a intermittenza** (oc:7989) con «Cannot configure the test module when the test module has already been instantiated»: qualunque spec che attiva il TestBed via `TestBed.inject()` senza resettarlo lo lascia attivo, e il file successivo — scelto a caso da Jasmine — va in errore appena chiama `configureTestingModule()`. Il sintomo cambia ad ogni run e non indica il file colpevole: da qui il pattern difensivo su tutti gli spec invece che un fix mirato.
- **Il campo `static` sopravvive al reset** (oc:7989): `WmTransPipe.sub` continuava a puntare alla subscription del test precedente, così i test successivi creavano un nuovo `Subject` su cui la subscription non scattava mai.
- **Una sottoclasse di `TranslateService` deve dichiarare tutti i parametri del costruttore** (oc:7989): `LangService` estende `TranslateService`, che non è registrato direttamente come provider; senza i parametri espliciti passati a `super(...)`, Angular DI non li inietta.
- **Il mock di una `HttpClient.get()` con `observe: 'response'` deve restituire una `HttpResponse`** (oc:7989), non il body: `ec.service.ts` legge `response.headers`, e uno spy che ritorna il body grezzo fa fallire il test con un `TypeError` che sembra un bug del service.

## Debito noto

**Gli spec di `wm-core` possono restare non eseguibili per errori TypeScript altrui** (oc:8147): un campo rimosso da `WmPosthogProps` in `wm-types` ha impedito di lanciare `ng test wm-core` in locale, pur non c'entrando nulla con il lavoro in corso. Quando accade, il test scritto non è verificabile finché il submodule non è allineato.
