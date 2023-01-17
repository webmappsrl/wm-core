import {Component, Input} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';

@Component({
  selector: 'wm-tab-description',
  templateUrl: './tab-description.component.html',
  styleUrls: ['./tab-description.component.scss'],
})
export class WmTabDescriptionComponent {
  @Input() description;

  constructor(public domSanitazer: DomSanitizer) {}
}
