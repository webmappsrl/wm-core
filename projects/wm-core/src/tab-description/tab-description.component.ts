import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {LangService} from '@wm-core/localization/lang.service';
import {BehaviorSubject, combineLatest} from 'rxjs';
import {map} from 'rxjs/operators';

@Component({
  selector: 'wm-tab-description',
  templateUrl: './tab-description.component.html',
  styleUrls: ['./tab-description.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmTabDescriptionComponent {
  private readonly MAX_CHARACTERS = 220;

  private _fullDescription: string;
  private _truncatedDescription: string;

  @Input() set description(value:string) {
    const description = this._langSvc.instant(value);
    this._fullDescription = description;
    this._truncatedDescription = this._truncateHtml(description, this.MAX_CHARACTERS);
  }

  isExpanded$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  showExpandButton$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  displayHtml$ = combineLatest([this.isExpanded$, this.showExpandButton$]).pipe(
    map(([isExpanded, showButton]) => {
      if (isExpanded || !showButton) {
        return this.domSanitazer.bypassSecurityTrustHtml(this._fullDescription);
      }
      return this.domSanitazer.bypassSecurityTrustHtml(this._truncatedDescription);
    })
  );

  constructor(public domSanitazer: DomSanitizer, private _langSvc: LangService) {}

  toggleExpand() {
    this.isExpanded$.next(!this.isExpanded$.value);
  }

  private _truncateHtml(html: string, maxLength: number): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    let charCount = 0;
    let wasTruncated = false;

    const truncateNode = (node: Node): boolean => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (charCount + node.textContent?.length > maxLength) {
          node.textContent = node.textContent?.substring(0, maxLength - charCount) + '...';
          wasTruncated = true;
          return true;
        }
        charCount += node.textContent?.length ?? 0;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        for (let i = 0; i < node.childNodes.length; i++) {
          if (truncateNode(node.childNodes[i])) {
            while (node.childNodes.length > i + 1) {
              node.removeChild(node.childNodes[i + 1]);
            }
            wasTruncated = true;
            return true;
          }
        }
      }
      return false;
    };

    truncateNode(div);
    this.showExpandButton$.next(wasTruncated);
    return div.innerHTML;
  }
}
