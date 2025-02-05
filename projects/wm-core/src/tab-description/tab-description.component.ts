import {Component, Input, ViewEncapsulation} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';

@Component({
  selector: 'wm-tab-description',
  templateUrl: './tab-description.component.html',
  styleUrls: ['./tab-description.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class WmTabDescriptionComponent {
  @Input() description:string;

  constructor(public domSanitazer: DomSanitizer) {}
}
