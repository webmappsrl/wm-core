---
paths:
  - "projects/wm-core/src/passport/**"
---

# Trappole: modali Ionic e `ion-nav`

Contesto: [docs/knowledge/8166-passaporto-camminatore-validazione-credenziale-cartacea.md](../../docs/knowledge/8166-passaporto-camminatore-validazione-credenziale-cartacea.md).

- **Non passare la radice di `ion-nav` con `[root]` e `[rootParams]`.** Il watcher di Ionic su
  `root` chiama subito `setRoot(root, rootParams)`: se l'elemento è già idratato quando Angular
  assegna `root` (prima di `rootParams`), la pagina nasce senza parametri, e succede solo a volte.
  Usa `nav.setRoot(Componente, params)` in `ngAfterViewInit` (oc:8166).
- **Un gestore del back hardware sopra 100 deve chiudere lui gli alert aperti.** Ionic esegue solo
  il gestore con priorità più alta, e gli overlay usano 100: con 101 un alert aperto non si chiude
  e il back fa altro, per esempio apre un secondo alert. Controlla `AlertController.getTop()`
  prima di tutto (oc:8166).
- **In un componente `OnPush` dentro `ion-nav` non riassegnare l'observable del template in
  `ionViewWillEnter()`**: l'hook non segna la view da aggiornare e il template resta legato allo
  stream vecchio. Usa uno stream stabile che riemette, per esempio un `BehaviorSubject` con
  `switchMap` (oc:8166).
