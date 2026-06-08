> Ticket: oc:7989

# Notes — wm-core: fix test suite (112 spec)

## Problema

I test wm-core fallivano in modo intermittente con l'errore:
> "Cannot configure the test module when the test module has already been instantiated"

Root cause: Jasmine randomizza l'ordine dei test tra spec file. Qualsiasi test che attiva il TestBed (tramite `TestBed.inject()`) senza resettarlo in `afterEach` lascia il TestBed in stato "attivato". Il test successivo (in un file diverso) tenta di chiamare `configureTestingModule()` su un TestBed già attivo → errore.

## Fix applicati

### Pattern difensivo `TestBed.resetTestingModule()`

Aggiunto in tutti gli spec file che usano TestBed:
- **Inizio di ogni `beforeEach`** che chiama `configureTestingModule`: reset preventivo prima della configurazione
- **In `afterEach`**: reset dopo ogni test per pulire lo stato

File interessati: `ugc.effects.spec.ts`, `ugc.service.spec.ts`, `update.service.spec.ts`, `posthog-capacitor.client.spec.ts`, `wmtrans.pipe.spec.ts`

### `wmtrans.pipe.spec.ts` — static field `WmTransPipe.sub`

`WmTransPipe` usa `private static sub: Subscription | null = null`. Dopo il primo test, il campo statico puntava ancora alla subscription del `langChange$` del test precedente. I test successivi creavano nuovi `Subject` ma la subscription non scattava.

**Fix:** in `afterEach`, reset esplicito dei campi statici:
```typescript
const sub = (WmTransPipe as any)['sub'];
if (sub) { sub.unsubscribe(); }
(WmTransPipe as any)['sub'] = null;
((WmTransPipe as any)['cdrs'] as Set<any>).clear();
```

### `ec.service.spec.ts` — mock HTTP con `observe: 'response'`

`ec.service.ts` usa `HttpClient.get()` con `observe: 'response'`, che restituisce `Observable<HttpResponse<T>>` (non `Observable<T>`). Il test spy restituiva il body grezzo, causando `TypeError: Cannot read properties of undefined (reading 'get')` su `response.headers`.

**Fix:** il spy restituisce `of(new HttpResponse({status: 200, body: remoteTrack, headers: new HttpHeaders()}))`.

### `lang.service.ts` — constructor signature esplicita

`LangService extends TranslateService`. In `TranslateService`, il constructor richiede dipendenze esplicite (store, loader, compiler, parser, ecc.). Con Angular DI, se la superclasse non è direttamente registrata come provider ma viene estesa, i parametri devono essere dichiarati esplicitamente nel costruttore della sottoclasse per essere iniettati correttamente.

**Fix:** tutti i parametri di `TranslateService` dichiarati esplicitamente nel constructor di `LangService` con passaggio a `super(...)`.

### `ec.service.ts` — semplificazione accesso lingua

`getFallbackLang()` e `getCurrentLang()` rimossi a favore delle property dirette `defaultLang` e `currentLang` (API standard di `TranslateService` che `LangService` espone).

### Spec eliminato: `search-box.component.spec.ts`

`CardBigComponent` non è più usato nella pagina. Il file `projects/wm-core/src/box/search-box/search-box.component.spec.ts` è stato eliminato.

### `angular.json` e `karma.conf.js`

- `angular.json`: aggiunto `"karmaConfig": "karma.conf.js"` nelle `options` del target `test` (wm-core usava la config di default, non quella del progetto)
- `karma.conf.js`: aggiunto il launcher `ChromeHeadlessNoSandbox` con flag `--no-sandbox`, `--disable-gpu` per l'ambiente CI

## Risultato

112/112 SUCCESS in CI headless Chrome.
