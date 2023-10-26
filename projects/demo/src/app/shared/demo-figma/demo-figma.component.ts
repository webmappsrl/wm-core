import {Component, Input} from '@angular/core';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';

@Component({
  selector: 'app-demo-figma',
  templateUrl: './demo-figma.component.html',
  styleUrls: ['./demo-figma.component.scss'],
})
export class DemoFigmaComponent {
  constructor(public sanitizer: DomSanitizer) {}
  @Input() figmaUrl: string;
  @Input() figmaIframeUrl: string;

  sanitaze(val): SafeHtml {
    return this.sanitizer.bypassSecurityTrustResourceUrl(val);
  }
}
