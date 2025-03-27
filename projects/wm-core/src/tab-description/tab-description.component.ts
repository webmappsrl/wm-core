import {
  ChangeDetectionStrategy,
  Component,
  Input,
  ViewEncapsulation,
  ElementRef,
  ViewChild,
} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {LangService} from '@wm-core/localization/lang.service';
import {BehaviorSubject} from 'rxjs';

export const MAX_LINES = 5;
@Component({
  selector: 'wm-tab-description',
  templateUrl: './tab-description.component.html',
  styleUrls: ['./tab-description.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmTabDescriptionComponent {
  htmlDescription$: BehaviorSubject<string> = new BehaviorSubject<string>(null);

  @Input() set description(value:string) {
    const description = this._langSvc.instant(value);
    this.htmlDescription$.next(this._addTruncationClass(description))
  }
  @ViewChild('descriptionElement') descriptionElement: ElementRef;

  isExpanded$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  showExpandButton$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(public domSanitazer: DomSanitizer, private _langSvc: LangService) {
    document.documentElement.style.setProperty('--wm-max-description-lines', `${MAX_LINES}`);
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

  private _checkIfContentIsTruncated() {
    const interval = setInterval(() => {
      const element = this.descriptionElement.nativeElement;
      const scrollHeight = element.scrollHeight;
      if (scrollHeight && scrollHeight > 0) {
        clearInterval(interval);
        const lineHeight = parseInt(window.getComputedStyle(element).lineHeight);
        const maxHeight = lineHeight * MAX_LINES;

        this.showExpandButton$.next(scrollHeight > maxHeight);
      }
    }, 50);
  }
}
