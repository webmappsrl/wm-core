> Ticket: oc:8174

# Controllo aggiornamenti app al resume

## Cosa cambia

Ogni volta che l'app torna in foreground (evento Capacitor `appStateChange.isActive: true`) mentre il processo è ancora vivo, viene eseguito un controllo della versione disponibile sullo store. Attualmente il controllo avviene solo all'avvio a freddo (`checkAppVersion` dispatchata una sola volta da `app.component.ts` dopo `loadConfSuccess`). Con questa feature il controllo viene ripetuto ad ogni resume di sessione viva, con throttling già gestito da `UpdateService` (patch: 6h, minor: 2h, major: sempre).

**Scope:** copre resume brevi/medi (minuti–ore) in cui il processo è ancora in memoria su entrambe le piattaforme. I cold start (iOS termina il processo dopo background prolungato) sono già coperti dal meccanismo esistente in `app.component.ts`.

## Perché

Un utente che alterna background/foreground frequentemente — o che lascia l'app in background su Android dove i processi vivono più a lungo — non riceve notifiche di aggiornamento tra un cold start e l'altro. Il trigger sul foreground colma questo gap senza impatto sulle prestazioni grazie al throttling esistente.

## Requisiti

- [ ] `UpdateService` espone un metodo `startForegroundWatcher(appConfig: APP): Promise<void>` che registra `App.addListener('appStateChange', ...)` e chiama `handleAppUpdateFlow(appConfig)` quando `isActive: true`
- [ ] Ogni chiamata a `startForegroundWatcher` esegue `await this._foregroundHandle?.remove()` prima di registrare il nuovo listener — elimina la finestra in cui entrambi i listener sono attivi (`remove()` è asincrono)
- [ ] Il `PluginListenerHandle` restituito da `App.addListener` viene salvato in `_foregroundListenerHandle` per il remove futuro
- [ ] Guard `isAppMobile` in `startForegroundWatcher`: se non siamo su native, il metodo ritorna senza registrare nulla
- [ ] Un nuovo effect NgRx `startForegroundVersionWatcher$` in `conf.effects.ts` ascolta `loadConfSuccess` e chiama il watcher via `switchMap(() => from(this._updateService.startForegroundWatcher(action.conf.APP)).pipe(catchError(() => EMPTY)))` con `dispatch: false` — la Promise è tracciata e gli errori non inghiottiti silenziosamente
- [ ] Il throttling non viene modificato — rimane delegato a `UpdateService.handleAppUpdateFlow` (patch 6h, minor 2h, major sempre)

## Rischi

- **`loadConfSuccess` ri-dispatchata con conf aggiornata:** il remove-before-register garantisce che il listener usi sempre il `confApp` più recente. Comportamento corretto e intenzionale.
- **`App.addListener` non disponibile su browser:** mitigato dal guard `isAppMobile` — su browser il metodo ritorna senza registrare nulla.
- **Rollback:** la modifica tocca wm-core (submodule) — un hotfix richiede revert in wm-core + bump del puntatore submodulo in webmapp-app + deploy. Nessun feature flag previsto: il throttling esistente limita i danni nel caso peggiore.
- **iOS background prolungato:** il processo viene terminato dall'OS → cold start → già coperto dall'`app.component.ts` esistente. Questo caso non è in scope di questa feature.

## Out of scope

- Modifiche al meccanismo di throttling esistente in `UpdateService`
- Modifiche a `DeviceService.onForeground` (ReplaySubject Cordova legacy)
- Trigger del check su eventi diversi dal foreground (timer, connettività)
- Feature flag runtime per disabilitare il watcher
- Test E2E (dipende dal ciclo di vita nativo Capacitor, non testabile via Cypress)

## Moduli toccati

| File | Repo | Modifica |
|---|---|---|
| `projects/wm-core/src/services/update.service.ts` | wm-core | Aggiunge `startForegroundWatcher(appConfig)` + `_foregroundListenerHandle` |
| `projects/wm-core/src/store/conf/conf.effects.ts` | wm-core | Aggiunge `startForegroundVersionWatcher$` su `loadConfSuccess` |
