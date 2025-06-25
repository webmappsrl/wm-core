import {DOCUMENT} from '@angular/common';
import {Component, Inject, Renderer2} from '@angular/core';
import {Store} from '@ngrx/store';
import {EnvironmentService} from '@wm-core/services/environment.service';
import {confAPP, confWEBAPP} from '@wm-core/store/conf/conf.selector';
import {Observable} from 'rxjs';
import {filter, take} from 'rxjs/operators';

@Component({
  selector: 'webmapp-meta',
  template: `
    <meta charset="utf-8" />
    <title>{{(APP$|async).name}}</title>

    <base href="#" />

    <meta name="color-scheme" content="light" />
    <meta
      name="viewport"
      content="viewport-fit=cover, width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no"
    />
    <meta name="format-detection" content="telephone=no" />
    <meta name="msapplication-tap-highlight" content="no" />

    <link rel="icon" type="image/png" href="assets/icon/favicon.png" />

    <script src="https://openlayers.org/en/v6.9.0/examples/resources/mapbox-streets-v6-style.js"></script>

    <!-- add to homescreen for ios -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black" />
  `,
})
export class MetaComponent {
  APP$: Observable<any> = this._store.select(confAPP);
  WEBAPP$: Observable<any> = this._store.select(confWEBAPP);

  constructor(
    private _store: Store<any>,
    @Inject(DOCUMENT) private _document: Document,
    private _renderer: Renderer2,
    private _environmentSvc: EnvironmentService,
  ) {
    const shardName = this._environmentSvc.shardName;
    const appId = this._environmentSvc.appId;
    if(appId && shardName) {
      const styleLink: any = this._renderer.createElement('link') as HTMLLinkElement;
      this._renderer.setProperty(styleLink, 'rel', 'stylesheet');
      this._renderer.setProperty(styleLink, 'href', `theme/${shardName}/${appId}.css`);
      this._renderer.setProperty(styleLink, 'id', 'client-theme');
      this._renderer.appendChild(this._document.head, styleLink);
    }

    this.WEBAPP$.pipe(
      filter(webApp => webApp != null && webApp.gu_id != null),
      take(1),
    ).subscribe(webApp => {
      this._loadScript(`https://www.googletagmanager.com/gtag/js?id=${webApp.gu_id}`);

      const script = this._renderer.createElement('script');
      this._renderer.appendChild(this._document.head, script);
      script.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag() {
        dataLayer.push(arguments);
      }
      gtag("js", new Date());
      gtag("config", "${webApp.gu_id}");
  `;
    });
  }

  private _loadScript(url: string): void {
    const s = this._renderer.createElement('script');
    this._renderer.setAttribute(s, 'src', url);
    this._renderer.setAttribute(s, 'async', '');
    this._renderer.appendChild(this._document.head, s);
  }
}
