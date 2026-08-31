import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewEncapsulation,
} from '@angular/core';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {LangService} from '@wm-core/localization/lang.service';
import {
  ConfigDetailBox,
  ConfigDetailInfoBox,
  ConfigDetailInfoBoxItem,
  ConfigDetailToggleEvent,
} from '@wm-types/config';
import {Language} from '@wm-types/language';
import {Subscription} from 'rxjs';

/** Item pronto per il rendering, con l'informazione se inizia un nuovo gruppo (per lo spazio extra tra gruppi). */
interface IConfigDetailItemEntry {
  kind: 'item';
  item: ConfigDetailInfoBoxItem;
  /** Indice progressivo tra i soli item (non conta i pulsanti "Mostra altro"/"Mostra meno"), usato solo per costruire id/aria-controls univoci nel template — l'identità dell'item per `isOpen`/`toggle` è `item` stesso, non questo indice. */
  itemIndex: number;
  /** `true` se è il primo item visibile di un gruppo diverso dal primo (serve più spazio sopra, nessuna intestazione visibile). */
  isGroupStart: boolean;
}

/** Pulsante "Mostra altro" in fondo a un gruppo che ha ancora item nascosti oltre la pagina corrente. */
interface IConfigDetailShowMoreEntry {
  kind: 'show-more';
  /** Indice del gruppo (tra quelli con `box_type: 'info'`) a cui appartiene, per `showMore(groupIndex)`. */
  groupIndex: number;
}

/** Pulsante "Mostra meno" in fondo a un gruppo espanso per intero (nessun item nascosto rimasto). */
interface IConfigDetailShowLessEntry {
  kind: 'show-less';
  /** Indice del gruppo (tra quelli con `box_type: 'info'`) a cui appartiene, per `showLess(groupIndex)`. */
  groupIndex: number;
}

type IConfigDetailRenderEntry =
  | IConfigDetailItemEntry
  | IConfigDetailShowMoreEntry
  | IConfigDetailShowLessEntry;

/**
 * Renderizza `properties.config_detail` (Layer/EcTrack/EcPoi, oc:8181) come un'unica lista di
 * accordion custom, concatenando tutti i gruppi con `box_type` riconosciuto (oggi solo `'info'`)
 * senza intestazione visibile tra un gruppo e l'altro. Dispatch per `box_type` centralizzato
 * qui (oggi filtra solo `'info'`) — un futuro tipo di box richiederà comunque di estendere
 * questo componente (nuovo case nel filtro/getter e nel template), ma senza toccare i template
 * consumer (`home-layer`, `track-properties`, `poi-properties`), che restano un singolo
 * binding invariato.
 *
 * Accordion implementato senza `ion-accordion` (decisione esplicita, per evitare la dipendenza
 * da quel componente Ionic): apertura/chiusura tracciata per riferimento-item in `_openItem` (un
 * solo item aperto alla volta — aprirne uno chiude quello precedente), header con `<button>`
 * nativo per mantenere gratis focus/keyboard, `aria-expanded`/`aria-controls` gestiti a mano.
 *
 * Ogni gruppo mostra al massimo `PAGE_SIZE` item alla volta: se un gruppo ne ha di più, in fondo
 * compare un pulsante "Mostra altro" (tradotto via `wmtrans`, stessa chiave già usata da
 * `wm-tab-description`) che ne rivela altri `PAGE_SIZE`, ripetibile finché il gruppo non è
 * completamente mostrato. Una volta mostrato per intero, il pulsante diventa "Mostra meno" e
 * torna alla pagina iniziale, chiudendo anche l'eventuale item aperto (nessun riferimento a un
 * item non più garantito visibile).
 */
@Component({
  standalone: false,
  selector: 'wm-config-detail',
  templateUrl: './config-detail.component.html',
  styleUrls: ['./config-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ConfigDetailComponent implements OnDestroy {
  /** Quanti item mostrare per gruppo alla prima visualizzazione, e quanti aggiungerne ad ogni "Mostra altro". */
  private static readonly PAGE_SIZE = 10;

  @Input()
  set groups(value: ConfigDetailBox[] | null | undefined) {
    this._groups = value ?? [];
    // Reset perché l'istanza viene riusata tra entità diverse (es. navigazione tra due layer) e
    // il riferimento non è più raggiungibile da `visibleEntries` dopo il reset.
    this._openItem = null;
    this._clearSettleTimers();
    // Stessa ragione: un toggle in attesa di assestamento riferirebbe un item/header ormai
    // disconnesso dall'entità appena caricata.
    this._pendingToggleEvent = null;
    // Stessa ragione: la paginazione è per indice di gruppo, che ha senso solo per l'attuale `_groups`.
    this._visibleCountPerGroup = [];
    // Stessa ragione: la cache è keyed per riferimento-item, gli item vecchi non sono più
    // raggiungibili da `visibleEntries` dopo il reset e andrebbero altrimenti trattenuti in memoria.
    this._safeContentCache.clear();
  }
  get groups(): ConfigDetailBox[] {
    return this._groups;
  }
  private _groups: ConfigDetailBox[] = [];

  /**
   * Item attualmente aperto, o `null` se tutti chiusi. Tracciato per riferimento all'oggetto
   * item (non per indice posizionale): un indice si disallineerebbe silenziosamente quando
   * `showMore`/`showLess` cambia quanti item di un gruppo PRECEDENTE sono visibili, spostando
   * la posizione di tutti gli item nei gruppi successivi nella lista appiattita. Privato: né il
   * template né alcun consumer esterno leggono questo campo direttamente, solo tramite `isOpen()`.
   */
  private _openItem: ConfigDetailInfoBoxItem | null = null;

  /**
   * Debounce di assestamento: dopo l'ultima `transitionend` pertinente ricevuta, quanto aspettare
   * prima di considerare il layout stabile e dispacciare `configDetailSettled`. Copre il caso di
   * DUE wrapper che transitionano dallo stesso click (chiusura + apertura, es. STORIA→ACQUA):
   * senza questo, ci si fermerebbe al primo `transitionend` mentre l'altro elemento sta ancora
   * cambiando altezza, causando un secondo, piccolo spostamento subito dopo (oc:8427).
   *
   * Vincolo (solo interno a questo file): deve restare sensibilmente sotto `SETTLE_FALLBACK_MS`
   * (400ms) — altrimenti il fallback potrebbe scattare prima ancora che il debounce di
   * assestamento abbia la possibilità di farlo, vanificandolo. Nessun vincolo cross-repo verso
   * webmapp-app resta oggi: il resize automatico di `wm-map-details` in risposta a questo evento
   * è stato rimosso interamente (non solo ricalibrato) nello stesso ciclo — vedi
   * `map-details.component.ts` → `onConfigDetailSettled()`, webmapp-app.
   */
  private static readonly SETTLE_DEBOUNCE_MS = 50;

  /**
   * Fallback se `transitionend` non arriva mai per la proprietà attesa (transizione interrotta da
   * un secondo click prima che finisca — garantito dalla specifica CSS, non un edge case raro).
   * 300ms di durata nota della transizione (`grid-template-rows`, vedi
   * `config-detail.component.scss`) + 100ms di margine.
   */
  private static readonly SETTLE_FALLBACK_MS = 400;

  private _pendingToggleEvent: ConfigDetailToggleEvent | null = null;
  private _settleDebounceId: ReturnType<typeof setTimeout> | null = null;
  private _settleFallbackId: ReturnType<typeof setTimeout> | null = null;

  /**
   * Filtra su `propertyName` (esclude le altre transizioni CSS del componente, es. `border-color`
   * dell'header o `opacity` del pulsante "Mostra altro") E su `target` (esclude un `transitionend`
   * bubbled da dentro il contenuto HTML backend-driven iniettato via `[innerHTML]`, che potrebbe
   * avere una propria transizione che usa per coincidenza lo stesso nome di proprietà — il
   * listener è sull'host component, quindi riceve in bubbling anche quelli).
   */
  private readonly _onTransitionEnd = (ev: TransitionEvent): void => {
    const isContentWrapperTransition =
      (ev.target as HTMLElement | null)?.classList?.contains(
        'wm-config-detail-content-wrapper',
      ) === true;
    if (
      ev.propertyName !== 'grid-template-rows' ||
      !isContentWrapperTransition ||
      this._pendingToggleEvent == null
    )
      return;
    if (this._settleDebounceId != null) clearTimeout(this._settleDebounceId);
    this._settleDebounceId = setTimeout(
      () => this._flushPendingToggle(),
      ConfigDetailComponent.SETTLE_DEBOUNCE_MS,
    );
  };

  /** Quanti item sono attualmente mostrati per ciascun gruppo (indice = posizione del gruppo tra quelli con `box_type: 'info'`); assente = `PAGE_SIZE`. */
  private _visibleCountPerGroup: number[] = [];

  /** Prefisso univoco per istanza, per evitare id DOM duplicati quando più istanze di questo componente sono nella stessa pagina. */
  private readonly _uid = Math.random().toString(36).slice(2);

  /** Cache del `SafeHtml` per item, per non richiamare `bypassSecurityTrustHtml` ad ogni change detection (vedi `getSafeContent`). */
  private readonly _safeContentCache = new Map<
    ConfigDetailInfoBoxItem,
    {content: string; safeHtml: SafeHtml}
  >();

  private _langChangeSub: Subscription;

  constructor(
    private _langSvc: LangService,
    private _cdr: ChangeDetectorRef,
    private _sanitizer: DomSanitizer,
    private _elRef: ElementRef<HTMLElement>,
  ) {
    this._langChangeSub = this._langSvc.onLangChange.subscribe(() => this._cdr.markForCheck());
    this._elRef.nativeElement.addEventListener('transitionend', this._onTransitionEnd);
  }

  /** Prefisso univoco per istanza, usato nel template per costruire id/aria-controls non duplicati. */
  get uid(): string {
    return this._uid;
  }

  ngOnDestroy(): void {
    this._langChangeSub?.unsubscribe();
    this._elRef.nativeElement.removeEventListener('transitionend', this._onTransitionEnd);
    this._clearSettleTimers();
  }

  /**
   * Entry pronte per il rendering (item + pulsanti "Mostra altro"), da tutti i gruppi `'info'`
   * concatenati. Filtra le righe senza alcuna traduzione disponibile (né per `title` né per
   * `content`, dopo il fallback a cascata). Gruppi con `box_type` non riconosciuto vengono
   * ignorati — stesso comportamento del resolver backend, che scarta silenziosamente i box_type
   * senza layout registrato.
   *
   * Ogni gruppo mostra al massimo `PAGE_SIZE` item (vedi `_visibleCountPerGroup`); se ne restano
   * di nascosti, l'ultima entry del gruppo è un pulsante `'show-more'` invece di un item. Se
   * invece il gruppo era stato espanso (pagina corrente > `PAGE_SIZE`) e ora li mostra tutti,
   * l'ultima entry è `'show-less'` per tornare alla pagina iniziale. Il primo item visibile di un
   * gruppo diverso dal primo porta `isGroupStart: true` — nessuna intestazione visibile tra un
   * gruppo e l'altro, ma serve uno spazio verticale maggiore rispetto a quello tra item dello
   * stesso gruppo (fedele al mockup/sito di riferimento).
   *
   * Orchestrazione pura: il filtro per traduzione disponibile e la paginazione di un singolo
   * gruppo vivono in `_visibleItemsInGroup()`, questo getter si limita a concatenare i gruppi e a
   * costruire le entry (item/show-more/show-less) con gli indici progressivi.
   */
  get visibleEntries(): IConfigDetailRenderEntry[] {
    const result: IConfigDetailRenderEntry[] = [];
    let itemIndex = 0;
    this._groups
      .filter((group): group is ConfigDetailInfoBox => group.box_type === 'info')
      .forEach((group, groupIndex) => {
        const {shownItems, totalItems} = this._visibleItemsInGroup(group, groupIndex);
        if (totalItems === 0) return;
        shownItems.forEach((item, indexInGroup) => {
          result.push({
            kind: 'item',
            item,
            itemIndex,
            isGroupStart: indexInGroup === 0 && result.length > 0,
          });
          itemIndex++;
        });
        if (shownItems.length < totalItems) {
          result.push({kind: 'show-more', groupIndex});
        } else if (shownItems.length > ConfigDetailComponent.PAGE_SIZE) {
          result.push({kind: 'show-less', groupIndex});
        }
      });
    return result;
  }

  /**
   * Item del gruppo `group` (indice `groupIndex`) con traduzione disponibile, limitati alla
   * pagina corrente di quel gruppo. Isola dal getter `visibleEntries` le due responsabilità che
   * riguardano un singolo gruppo (filtro traduzione + paginazione), lasciando a `visibleEntries`
   * solo l'orchestrazione tra gruppi (concatenazione, indici, entry `show-more`/`show-less`).
   *
   * @param group Gruppo `'info'` di cui calcolare gli item visibili.
   * @param groupIndex Indice del gruppo (tra quelli con `box_type: 'info'`), per leggere la sua pagina corrente.
   * @returns `shownItems` (item della pagina corrente) e `totalItems` (item con traduzione disponibile nel gruppo, prima della paginazione).
   */
  private _visibleItemsInGroup(
    group: ConfigDetailInfoBox,
    groupIndex: number,
  ): {shownItems: ConfigDetailInfoBoxItem[]; totalItems: number} {
    const translatedItems = (group.items ?? []).filter(
      item => this._resolve(item.title) !== '' || this._resolve(item.content) !== '',
    );
    // Non è la "dimensione di pagina" fissa (quella è la costante PAGE_SIZE): dopo N click su
    // "Mostra altro" vale N*PAGE_SIZE — è quanti item di QUESTO gruppo sono attualmente visibili.
    const visibleCount = this._visibleCountPerGroup[groupIndex] ?? ConfigDetailComponent.PAGE_SIZE;
    return {
      shownItems: translatedItems.slice(0, visibleCount),
      totalItems: translatedItems.length,
    };
  }

  /**
   * `trackBy` per `*ngFor="let entry of visibleEntries; trackBy: trackEntry"`. `visibleEntries` è
   * un getter che ricostruisce array di oggetti wrapper NUOVI ad ogni valutazione — senza questa
   * `trackBy`, `NgForOf` confronterebbe per identità di riferimento e tratterebbe ogni entry come
   * "rimossa e ricreata" ad ogni change detection (anche solo per il click su un item diverso,
   * dato che l'evento nasce nel template di questo stesso componente), distruggendo e
   * ricreando TUTTI i nodi DOM della lista: focus perso sull'header appena cliccato, nessuna
   * animazione di apertura visibile (il nodo nascerebbe già nel suo stato finale), e la cache di
   * `getSafeContent()` vanificata (il valore è cacheato, ma il nodo che lo ospita verrebbe
   * comunque ricreato). Chiave stabile: il riferimento all'item per le entry `'item'`
   * (`_groups`/`group.items` non cambia tra una valutazione e l'altra dello stesso binding di
   * `groups`), una chiave composita per `'show-more'`/`'show-less'` (non hanno un oggetto
   * proprio, ma sono identificate univocamente da tipo+gruppo).
   *
   * @param _ Indice nell'array (non usato, richiesto dalla firma di `TrackByFunction`).
   * @param entry Entry da identificare.
   * @returns Una chiave stabile tra una valutazione e l'altra dello stesso entry logico.
   */
  trackEntry(_: number, entry: IConfigDetailRenderEntry): unknown {
    return entry.kind === 'item' ? entry.item : `${entry.kind}-${entry.groupIndex}`;
  }

  /**
   * Verifica se `item` è attualmente aperto.
   *
   * @param item Item da verificare.
   * @returns `true` se l'item è aperto.
   */
  isOpen(item: ConfigDetailInfoBoxItem): boolean {
    return this._openItem === item;
  }

  /**
   * Alterna lo stato aperto/chiuso di `item`. Apertura esclusiva: aprirne uno chiude
   * automaticamente l'item precedentemente aperto (mai più di un item aperto alla volta). Programma
   * il dispatch di `configDetailSettled` (con l'header cliccato solo in apertura, mai in chiusura —
   * la responsabilità dello scroll resta sempre del consumer) una volta che il layout si è
   * assestato, non sincrono al click: vedi `SETTLE_DEBOUNCE_MS`/`SETTLE_FALLBACK_MS` e
   * `_flushPendingToggle()` (oc:8427).
   *
   * @param item Item da alternare.
   * @param event Evento click originato dal tap sull'header, usato solo per recuperare
   *   `currentTarget` come header da riportare in vista. Opzionale per restare backward-compatible
   *   con chiamate programmatiche che non hanno un evento DOM reale.
   */
  toggle(item: ConfigDetailInfoBoxItem, event?: Event): void {
    const opening = this._openItem !== item;
    this._openItem = opening ? item : null;
    this._pendingToggleEvent = {
      opening,
      headerElement: opening ? ((event?.currentTarget as HTMLElement) ?? null) : null,
    };
    this._clearSettleTimers();
    // Solo il fallback parte subito: il debounce di assestamento (SETTLE_DEBOUNCE_MS) va avviato
    // solo alla ricezione di una `transitionend` pertinente (vedi `_onTransitionEnd`) — avviarlo
    // già qui lo farebbe scattare prima ancora che la transizione CSS (0.3s) sia iniziata,
    // vanificando l'attesa che questo meccanismo dovrebbe garantire.
    this._settleFallbackId = setTimeout(
      () => this._flushPendingToggle(),
      ConfigDetailComponent.SETTLE_FALLBACK_MS,
    );
  }

  /** Cancella i timer di assestamento pendenti, senza eseguirne gli effetti. */
  private _clearSettleTimers(): void {
    if (this._settleDebounceId != null) clearTimeout(this._settleDebounceId);
    if (this._settleFallbackId != null) clearTimeout(this._settleFallbackId);
    this._settleDebounceId = null;
    this._settleFallbackId = null;
  }

  /**
   * Dispaccia `configDetailSettled` (evento DOM nativo, `bubbles: true`) dal proprio host —
   * invece di un `@Output()` Angular — così un consumer non direttamente parent (es.
   * `wm-map-details`, webmapp-app, che riceve questo componente come contenuto proiettato più
   * livelli sotto) può ascoltarlo con un semplice binding di template, senza che i componenti
   * intermedi (`wm-home-layer`, `wm-track-properties`, `wm-poi-properties`) debbano fare
   * pass-through (oc:8427). `composed: true` è una difesa a costo zero: nessun antenato reale ha
   * oggi Shadow DOM lungo questo percorso, ma protegge da una regressione silenziosa se in futuro
   * uno lo adottasse.
   */
  private _flushPendingToggle(): void {
    if (this._pendingToggleEvent == null) return;
    const detail = this._pendingToggleEvent;
    this._pendingToggleEvent = null;
    this._clearSettleTimers();
    this._elRef.nativeElement.dispatchEvent(
      new CustomEvent<ConfigDetailToggleEvent>('configDetailSettled', {
        detail,
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * Rivela altri `PAGE_SIZE` item del gruppo `groupIndex` (tra quelli con `box_type: 'info'`),
   * ripetibile finché il gruppo non è mostrato per intero (a quel punto `visibleEntries` produce
   * un pulsante `'show-less'` invece di `'show-more'` per quel gruppo).
   *
   * @param groupIndex Indice del gruppo (tra quelli con `box_type: 'info'`) di cui mostrare altri item.
   */
  showMore(groupIndex: number): void {
    const visibleCount = this._visibleCountPerGroup[groupIndex] ?? ConfigDetailComponent.PAGE_SIZE;
    this._visibleCountPerGroup[groupIndex] = visibleCount + ConfigDetailComponent.PAGE_SIZE;
  }

  /**
   * Torna alla pagina iniziale (`PAGE_SIZE` item) del gruppo `groupIndex`. Chiude anche
   * l'eventuale item aperto (`_openItem = null`), non solo se apparteneva al gruppo appena
   * ridotto: coerente con l'apertura esclusiva (un solo item aperto in tutto il componente) e
   * più semplice/predicibile di un controllo "l'item aperto è ancora tra quelli visibili?".
   *
   * Annulla anche un eventuale toggle ancora in attesa di assestamento (`_pendingToggleEvent`):
   * senza questo, se l'item chiuso da questa chiamata era anche quello appena aperto da un
   * `toggle()` non ancora dispacciato, il `transitionend` di CHIUSURA che questa collassata
   * genera farebbe comunque dispacciare `configDetailSettled` con `{opening: true}` — un'apertura
   * che in realtà non è (più) avvenuta.
   *
   * @param groupIndex Indice del gruppo (tra quelli con `box_type: 'info'`) da riportare alla pagina iniziale.
   */
  showLess(groupIndex: number): void {
    delete this._visibleCountPerGroup[groupIndex];
    this._openItem = null;
    this._clearSettleTimers();
    this._pendingToggleEvent = null;
  }

  /**
   * Risolve e sanifica il contenuto HTML di `item`, cacheando il risultato per item invece di
   * richiamare `bypassSecurityTrustHtml` ad ogni ciclo di change detection dal template:
   * `bypassSecurityTrustHtml` crea un nuovo oggetto `SafeHtml` ad ogni chiamata, quindi Angular
   * reassegnerebbe `innerHTML` anche quando l'item è chiuso o il suo contenuto non è cambiato —
   * ad es. al semplice toggle di UN ALTRO item, che marca dirty il componente OnPush e fa
   * ripartire la CD. Reassegnare `innerHTML` ricrea da zero un eventuale iframe/video al suo
   * interno, perdendo lo stato di playback. Il valore cacheato viene ricalcolato solo se il
   * contenuto risolto per la lingua corrente cambia (es. cambio lingua a runtime).
   *
   * @param item Item di cui risolvere il contenuto.
   * @returns Il contenuto HTML sanificato, pronto per il binding `[innerHTML]`.
   */
  getSafeContent(item: ConfigDetailInfoBoxItem): SafeHtml {
    const resolvedContent = this._resolve(item.content);
    const cached = this._safeContentCache.get(item);
    if (cached && cached.content === resolvedContent) {
      return cached.safeHtml;
    }
    const safeHtml = this._sanitizer.bypassSecurityTrustHtml(resolvedContent);
    this._safeContentCache.set(item, {content: resolvedContent, safeHtml});
    return safeHtml;
  }

  /**
   * Replica il fallback a cascata di `WmTransPipe` (lingua corrente → lingua di default →
   * prima lingua disponibile nell'oggetto) per decidere, lato componente (non solo in
   * template), se una riga ha almeno una traduzione disponibile.
   *
   * @param value Oggetto tradotto per lingua, o stringa/undefined.
   * @returns Il valore risolto per la lingua corrente, o stringa vuota se nessuna lingua ha contenuto.
   */
  private _resolve(value: Partial<Record<Language, string>> | undefined): string {
    if (!value) return '';
    const currentLang = this._langSvc.currentLang as Language | undefined;
    const defaultLang = this._langSvc.defaultLang as Language | undefined;
    if (currentLang && value[currentLang]) return value[currentLang];
    if (defaultLang && value[defaultLang]) return value[defaultLang];
    for (const k of Object.keys(value) as Language[]) {
      if (value[k]) return value[k];
    }
    return '';
  }
}
