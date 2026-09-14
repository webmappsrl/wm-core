# PostHog: contesto degli eventi e tracciamento

## Come funziona oggi

`PosthogContextService` è un wrapper trasparente attorno a `PosthogCapacitorClient`: implementa `WmPosthogClient` e arricchisce ogni evento con il contesto corrente — posizione, layer/POI/track — costruito in `_buildContext()`. Chi captura un evento non deve preoccuparsi del contesto.

`user_id` vive in quel contesto condiviso, quindi accompagna **tutti** gli eventi capturati, non solo quelli GPS, e solo se l'utente è loggato. I call site di `capture()` in wm-core sono 18 (contati il 2026-09-14, spec esclusi). Non c'è nessun `identify()`: il `distinct_id` di PostHog resta anonimo e per-device.

L'evento `userMoved` viene capturato direttamente in `GeolocationService._onLocationUpdate()`, con il campo `mode` (`GeolocationMode`, tipo condiviso in `wm-types/user-activity.ts`: `'navigation' | 'recording' | 'stopped'`).

## Perché così

- **`capture('userMoved')` dentro `GeolocationService`** (oc:8127): elimina la dipendenza circolare alla radice invece di aggirarla. Il service ha già `_mode` e `_posthogClient`, non serve nessun lazy workaround. Foreground e background sono impliciti nel watcher.
- **Lo scope ampio di `user_id` è deliberato** (oc:8159): decisione esplicita del developer *dopo* che l'analisi adversariale ne aveva quantificato l'ampiezza reale — non una conseguenza non vista.
- **Niente `identify()` in quel ciclo** (oc:8159): solo un `TODO(oc:8159)` nel punto pertinente. `user_id` viaggia come prop dell'evento, non come identità PostHog.
- **`GeolocationMode` in wm-types** (oc:8127): evita di ripetere la union literal fra `GeolocationService` e `WmPosthogProps.mode`.

## Debito noto

- **Nessun gate di consenso privacy, nessun flag `OPTIONS` per-shard** (oc:8159): coerente con il resto di PostHog nell'app, dove nessun evento è mai stato gated su `hasPrivacyAgree`. Rischio accettato esplicitamente dal developer, da ridiscutere se e quando wm-package userà il campo per la vista live-position — che il ticket originale promette «anonima».

## Trappole verificate

- **`Injector.get(GeolocationService, null)` non ritorna il default in un `TestBed` isolato** (oc:8159): il service è `providedIn: 'root'`, quindi Angular trova comunque il provider e tenta di istanziare l'intera catena `DeviceService` → `APP_VERSION`. Nei test va mockato direttamente (`{provide: GeolocationService, useValue: {location: null}}`), non le sue dipendenze transitive.
- **`posthog-capacitor.client.spec.ts` chiama `TestBed.resetTestingModule()` in un punto atipico** (oc:8159), dentro il corpo sincrono di un `it()` invece che in un hook: lascia il TestBed in uno stato che un nuovo `describe` eredita come "già istanziato". Vedi [testbed-isolamento.md](testbed-isolamento.md) — la difesa è il reset a inizio `beforeEach` nel proprio file, quello preesistente non è stato normalizzato.
- **`Record<string, any>` per i props** (oc:7980): `WmPosthogProps` è un'interfaccia tipizzata, quindi un object literal con chiavi arbitrarie passate da fuori fallisce l'excess-property check di TypeScript. La costruzione separata dell'oggetto serve a quello.
