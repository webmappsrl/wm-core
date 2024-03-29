import {Router, ActivatedRoute} from '@angular/router';
import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from '@angular/core';

import {DomSanitizer} from '@angular/platform-browser';
import {ModalController} from '@ionic/angular';
import {iLocalString} from 'wm-core/types/config';

@Component({
  selector: 'wm-inner-component-html',
  templateUrl: './inner-html.component.html',
  styleUrls: ['./inner-html.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmInnerHtmlComponent {
  @Input() enableDismiss = true;
  @Input() html: string | iLocalString;

  constructor(
    private _modalCtrl: ModalController,
    private _route: ActivatedRoute,
    private _router: Router,
    public sanitizer: DomSanitizer,
  ) {}

  dismiss(): void {
    this._modalCtrl.dismiss();
    this._router.navigate([], {
      relativeTo: this._route,
      queryParams: {slug: null},
      queryParamsHandling: 'merge',
    });
  }
}
