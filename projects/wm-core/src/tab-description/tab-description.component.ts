import {
  ChangeDetectionStrategy,
  Component,
  Input,
  ViewEncapsulation,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {LangService} from '@wm-core/localization/lang.service';
import {BehaviorSubject} from 'rxjs';

export const MAX_LINES = 5;

type TranslationValue = string | Record<string, string | null> | null | undefined;

@Component({
  standalone: false,
  selector: 'wm-tab-description',
  templateUrl: './tab-description.component.html',
  styleUrls: ['./tab-description.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmTabDescriptionComponent implements AfterViewInit, OnDestroy {
  /** Handle del timer di misura, per poterlo cancellare in ngOnDestroy e al cambio descrizione. */
  private _truncationCheckInterval: ReturnType<typeof setInterval> | null = null;
  htmlDescription$: BehaviorSubject<TranslationValue> = new BehaviorSubject<TranslationValue>(null);

  @Input() set description(value: TranslationValue) {
    const processedValue = this._cleanTranslationObject(value);

    if (processedValue && typeof processedValue === 'object' && !Array.isArray(processedValue)) {
      const withTruncationPerLang = Object.keys(processedValue).reduce((acc, key) => {
        const langValue = processedValue[key];
        acc[key] =
          typeof langValue === 'string' && langValue.trim().length > 0
            ? this._addTruncationClass(langValue)
            : langValue;
        return acc;
      }, {} as Record<string, string | null>);

      this.htmlDescription$.next(withTruncationPerLang);
    } else if (typeof processedValue === 'string') {
      this.htmlDescription$.next(this._addTruncationClass(processedValue));
    } else {
      this.htmlDescription$.next(processedValue);
    }

    // Senza questo reset la descrizione successiva eredita lo stato della precedente: l'istanza
    // viene riusata, non ricreata, quando cambia solo il binding — è quello che accade navigando
    // tra POI correlati, sia sul web sia su mobile. Il sintomo è "Mostra altro" su una descrizione
    // di una riga, o la sua assenza su una lunga.
    // `_checkIfContentIsTruncated()` è sicuro da chiamare anche prima di `ngAfterViewInit`: legge
    // `descriptionElement?.nativeElement` con optional chaining e riprova ogni 50ms finché
    // l'elemento non esiste, e si auto-cancella prima di riarmarsi, quindi i timer non si
    // accumulano al cambio descrizione.
    this.isExpanded$.next(false);
    this.showExpandButton$.next(false);
    this._checkIfContentIsTruncated();
  }
  @ViewChild('descriptionElement') descriptionElement: ElementRef;

  isExpanded$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  showExpandButton$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(public domSanitazer: DomSanitizer, private _langSvc: LangService) {}

  ngAfterViewInit() {
    // imposta il numero massimo di righe come variabile globale
    document.documentElement.style.setProperty('--wm-max-description-lines', `${MAX_LINES}`);

    const element = this.descriptionElement?.nativeElement as HTMLElement | undefined;
    if (element) {
      const computedLineHeight = window.getComputedStyle(element).lineHeight;

      // se la line-height è valorizzata, usala come variabile CSS locale
      if (computedLineHeight && computedLineHeight !== 'normal') {
        element.style.setProperty('--wm-description-line-height', computedLineHeight);
      }
    }

    this._checkIfContentIsTruncated();
  }

  toggleExpand() {
    this.isExpanded$.next(!this.isExpanded$.value);
  }

  private _addTruncationClass(htmlString: string): string {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;

    const allElements = tempDiv.querySelectorAll('*');
    allElements.forEach(el => {
      const text = Array.from(el.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent.trim())
        .join('');

      if (text.length > 0) {
        el.classList.add('truncable');
      }
    });

    return tempDiv.innerHTML;
  }

  /**
   * L'interval si azzerava solo quando `scrollHeight > 0`: se il componente veniva distrutto
   * prima della misura — nel popup web è dentro un `*ngIf` con una transizione da 500ms — restava
   * un timer a 20 Hz che chiama `getComputedStyle`, cioè un reflow forzato, per ogni istanza mai
   * misurata. Su mobile l'app si riavvia; una webapp su tablet/kiosk non ricarica mai la pagina.
   */
  private _checkIfContentIsTruncated() {
    this._clearTruncationCheck();
    this._truncationCheckInterval = setInterval(() => {
      const element = this.descriptionElement?.nativeElement;
      const scrollHeight = element?.scrollHeight;
      if (scrollHeight && scrollHeight > 0) {
        this._clearTruncationCheck();
        const lineHeight = parseInt(window.getComputedStyle(element).lineHeight);
        const maxHeight = lineHeight * MAX_LINES;

        this.showExpandButton$.next(scrollHeight > maxHeight);
      }
    }, 50);
  }

  private _clearTruncationCheck(): void {
    if (this._truncationCheckInterval != null) {
      clearInterval(this._truncationCheckInterval);
      this._truncationCheckInterval = null;
    }
  }

  ngOnDestroy(): void {
    this._clearTruncationCheck();
  }

  private _cleanTranslationObject(value: TranslationValue): TranslationValue {
    // Se value è un oggetto (dizionario), rimuovi le chiavi con valori null
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const cleanedObject = Object.keys(value).reduce((acc, key) => {
        if (value[key] !== null) {
          acc[key] = value[key];
        }
        return acc;
      }, {} as Record<string, string>);

      // Se l'oggetto è vuoto dopo la pulizia, assegna undefined
      return Object.keys(cleanedObject).length === 0 ? undefined : cleanedObject;
    }

    return value;
  }
}
