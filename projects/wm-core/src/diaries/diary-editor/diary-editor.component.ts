import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation,
  inject,
} from '@angular/core';
import {AlertController} from '@ionic/angular';
import type {AnyExtension, Editor} from '@tiptap/core';
import {LangService} from '@wm-core/localization/lang.service';
import {diaryPlainText, diaryVisibleLength, normalizeDiaryLink, trimDiaryHtml} from '../diary-text.utils';

/** Un bottone della barra. */
export interface DiaryEditorAction {
  /** Chiave per lo stato attivo e il `trackBy`. */
  key: string;
  /** Etichetta accessibile (chiave i18n). */
  label: string;
  /** Testo mostrato nel bottone, se non c'è l'icona. */
  text?: string;
  /** Icona Ionicons, al posto del testo. */
  icon?: string;
  /** Classe per lo stile del testo del bottone. */
  textClass?: string;
  /** È uno stile che si accende e si spegne (`aria-pressed`). */
  toggle?: boolean;
}

/** Bottoni della barra, nell'ordine (oc:8169, ciclo 3). Niente sottolineato. */
export const DIARY_EDITOR_ACTIONS: DiaryEditorAction[] = [
  {key: 'bold', label: 'Grassetto', text: 'B', textClass: 'is-bold', toggle: true},
  {key: 'italic', label: 'Corsivo', text: 'I', textClass: 'is-italic', toggle: true},
  {key: 'strike', label: 'Barrato', text: 'S', textClass: 'is-strike', toggle: true},
  {key: 'h2', label: 'Titolo', text: 'T', textClass: 'is-h2', toggle: true},
  {key: 'h3', label: 'Sottotitolo', text: 'T', textClass: 'is-h3', toggle: true},
  {key: 'bulletList', label: 'Elenco puntato', icon: 'list-outline', toggle: true},
  {key: 'orderedList', label: 'Elenco numerato', text: '1.', toggle: true},
  {key: 'blockquote', label: 'Citazione', text: '“', textClass: 'is-quote', toggle: true},
  {key: 'link', label: 'Collegamento', icon: 'link-outline', toggle: true},
  {key: 'hr', label: 'Linea di separazione', text: '—'},
  {key: 'undo', label: 'Annulla', icon: 'arrow-undo-outline'},
  {key: 'redo', label: 'Ripeti', icon: 'arrow-redo-outline'},
];

/** Moduli di Tiptap caricati al primo uso. */
export interface TiptapModules {
  Editor: typeof Editor;
  extensions: AnyExtension[];
}

/**
 * Editor del racconto (oc:8169, ciclo 3): testo formattato salvato come HTML. Tiptap si carica solo
 * all'apertura del form; se non si carica (PWA senza rete al primo uso) resta una casella di testo
 * semplice, e il backend converte il testo in paragrafi.
 */
@Component({
  standalone: false,
  selector: 'wm-diary-editor',
  templateUrl: './diary-editor.component.html',
  styleUrls: ['./diary-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmDiaryEditorComponent implements AfterViewInit, OnChanges, OnDestroy {
  /** Racconto in HTML. */
  @Input() value = '';
  /** Testo a editor vuoto (già tradotto). */
  @Input() placeholder = '';
  /** `id` dell'area di scrittura, per l'etichetta del form. */
  @Input() inputId = '';
  /** HTML corrente senza paragrafi vuoti finali; vuoto se l'editor è vuoto. Nel ripiego, testo semplice. */
  @Output() valueChange = new EventEmitter<string>();
  /** Caratteri di testo visibile. */
  @Output() lengthChange = new EventEmitter<number>();

  @ViewChild('content', {static: true}) private _content!: ElementRef<HTMLElement>;

  readonly actions = DIARY_EDITOR_ACTIONS;
  /** Stili attivi alla posizione del cursore. */
  active: Record<string, boolean> = {};
  /** `false` finché Tiptap non è caricato. */
  ready = false;
  /** Tiptap non si è caricato: si scrive nella casella semplice. */
  fallback = false;
  /** Testo della casella di ripiego. */
  fallbackText = '';

  private _cdr = inject(ChangeDetectorRef);
  private _zone = inject(NgZone);
  private _alertCtrl = inject(AlertController);
  private _langSvc = inject(LangService);
  private _editor: Editor | null = null;
  /** Ultimo valore emesso: un `value` uguale in ingresso non riscrive il contenuto. */
  private _emitted: string | null = null;
  /** Il form si è chiuso mentre Tiptap si caricava. */
  private _destroyed = false;

  async ngAfterViewInit(): Promise<void> {
    let modules: TiptapModules;
    try {
      modules = await this._loadTiptap();
    } catch {
      if (this._destroyed) return;
      this.fallback = true;
      this.fallbackText = diaryPlainText(this.value);
      this.lengthChange.emit(this.fallbackText.trim().length);
      this._cdr.markForCheck();
      return;
    }
    if (this._destroyed) return;
    this._editor = new modules.Editor({
      element: this._content.nativeElement,
      content: this.value || '',
      extensions: modules.extensions,
      editorProps: {
        attributes: {
          class: 'wm-diary-rich wm-diary-editor-area',
          ...(this.inputId ? {id: this.inputId} : {}),
          role: 'textbox',
          'aria-multiline': 'true',
        },
      },
      onUpdate: ({editor}) => this._zone.run(() => this._emit(editor)),
      onTransaction: () => this._zone.run(() => this._refreshActive()),
    });
    this.ready = true;
    this.lengthChange.emit(diaryVisibleLength(this.value));
    this._refreshActive();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['value'] || this.value === this._emitted) return;
    if (this._editor) {
      this._editor.commands.setContent(this.value || '', {emitUpdate: false});
      this.lengthChange.emit(diaryVisibleLength(this.value));
    } else if (this.fallback) {
      this.fallbackText = diaryPlainText(this.value);
    }
  }

  ngOnDestroy(): void {
    this._destroyed = true;
    this._editor?.destroy();
    this._editor = null;
  }

  /** @returns l'editor, per i test */
  get editor(): Editor | null {
    return this._editor;
  }

  /**
   * Testo scritto nella casella di ripiego.
   * @param text testo
   */
  onFallbackInput(text: string): void {
    this.fallbackText = text;
    this._emitted = text;
    this.valueChange.emit(text);
    this.lengthChange.emit(text.trim().length);
  }

  /**
   * Applica il bottone della barra.
   * @param action bottone
   */
  async run(action: DiaryEditorAction): Promise<void> {
    const editor = this._editor;
    if (!editor) return;
    if (action.key === 'link') {
      await this._editLink(editor);
      return;
    }
    const chain = editor.chain().focus();
    const commands: Record<string, () => boolean> = {
      bold: () => chain.toggleBold().run(),
      italic: () => chain.toggleItalic().run(),
      strike: () => chain.toggleStrike().run(),
      h2: () => chain.toggleHeading({level: 2}).run(),
      h3: () => chain.toggleHeading({level: 3}).run(),
      bulletList: () => chain.toggleBulletList().run(),
      orderedList: () => chain.toggleOrderedList().run(),
      blockquote: () => chain.toggleBlockquote().run(),
      hr: () => chain.setHorizontalRule().run(),
      undo: () => chain.undo().run(),
      redo: () => chain.redo().run(),
    };
    commands[action.key]?.();
  }

  /**
   * @param _ indice
   * @param action bottone
   * @returns la chiave del bottone
   */
  trackAction(_: number, action: DiaryEditorAction): string {
    return action.key;
  }

  /**
   * Carica Tiptap con le sole estensioni ammesse. Separato per poterlo far fallire nei test.
   * @returns i moduli
   */
  protected async _loadTiptap(): Promise<TiptapModules> {
    const [{Editor}, {StarterKit}, {Placeholder}] = await Promise.all([
      import('@tiptap/core'),
      import('@tiptap/starter-kit'),
      import('@tiptap/extensions'),
    ]);
    return {
      Editor,
      extensions: [
        StarterKit.configure({
          underline: false,
          code: false,
          codeBlock: false,
          heading: {levels: [2, 3]},
          link: {openOnClick: false, autolink: true, defaultProtocol: 'https', protocols: ['mailto']},
        }),
        Placeholder.configure({placeholder: this.placeholder}),
      ],
    };
  }

  /**
   * Chiede l'indirizzo del collegamento; vuoto lo toglie, uno non ammesso tiene aperto l'avviso.
   * @param editor editor
   */
  private async _editLink(editor: Editor): Promise<void> {
    const current = (editor.getAttributes('link')['href'] as string | undefined) ?? '';
    const alert = await this._alertCtrl.create({
      header: this._langSvc.instant('Collegamento'),
      inputs: [
        {name: 'href', type: 'url', value: current, placeholder: this._langSvc.instant('Indirizzo del collegamento')},
      ],
      buttons: [
        {text: this._langSvc.instant('Annulla'), role: 'cancel'},
        {
          text: this._langSvc.instant('Conferma'),
          role: 'confirm',
          handler: (values: {href?: string}) => {
            const href = String(values?.href ?? '').trim();
            return !href || normalizeDiaryLink(href) !== null;
          },
        },
      ],
    });
    await alert.present();
    const {role, data} = await alert.onDidDismiss();
    if (role !== 'confirm') {
      editor.commands.focus();
      return;
    }
    const href = normalizeDiaryLink(String(data?.values?.href ?? ''));
    const chain = editor.chain().focus().extendMarkRange('link');
    if (href) chain.setLink({href}).run();
    else chain.unsetLink().run();
  }

  /** Emette l'HTML corrente, vuoto a editor vuoto. */
  private _emit(editor: Editor): void {
    const html = editor.isEmpty ? '' : trimDiaryHtml(editor.getHTML());
    this._emitted = html;
    this.valueChange.emit(html);
    this.lengthChange.emit(diaryVisibleLength(html));
  }

  /** Aggiorna lo stato attivo dei bottoni. */
  private _refreshActive(): void {
    const editor = this._editor;
    if (!editor) return;
    this.active = {
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      strike: editor.isActive('strike'),
      h2: editor.isActive('heading', {level: 2}),
      h3: editor.isActive('heading', {level: 3}),
      bulletList: editor.isActive('bulletList'),
      orderedList: editor.isActive('orderedList'),
      blockquote: editor.isActive('blockquote'),
      link: editor.isActive('link'),
    };
    this._cdr.markForCheck();
  }
}
