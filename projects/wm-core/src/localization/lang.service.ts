/**
 * Languages Service
 *
 * It provides all the languages feature based on the app configuration,
 * such as default language, current language in use. It also handle the
 * tranlate service (ngx-translate) initialization. The translations are
 * available using the TranslateService
 *
 * */

import {Inject, Injectable} from '@angular/core';
import {
  MissingTranslationHandler,
  TranslateCompiler,
  TranslateLoader,
  TranslateParser,
  TranslateService,
  TranslateStore,
} from '@ngx-translate/core';
import {wmIT} from './i18n/it';
import {wmEN} from './i18n/en';
import {wmDE} from './i18n/de';
import {wmFR} from './i18n/fr';
import {wmPR} from './i18n/pr';
import {wmES} from './i18n/es';
import {wmSQ} from './i18n/sq';
import {Store} from '@ngrx/store';
import {confLANGUAGES, confTRANSLATIONS} from '@wm-core/store/conf/conf.selector';
import {filter, take} from 'rxjs/operators';
import {APP_TRANSLATION} from '@wm-core/store/conf/conf.token';
import {WmTranslations} from '@wm-types/language';
import {BehaviorSubject, combineLatest} from 'rxjs';
import {DeviceService} from '@wm-core/services/device.service';
@Injectable({
  providedIn: 'root',
})
export class LangService extends TranslateService {
  private _confTRANSLATIONS = this._store.select(confTRANSLATIONS);
  private _confLANGUAGES$ = this._store.select(confLANGUAGES);
  isInit$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(
    @Inject(APP_TRANSLATION) public appTranslation: WmTranslations,
    private _deviceService: DeviceService,
    private _store: Store<any>,
  ) {
    super();
    this._init();
  }

  private _init(): void {
    this.setTranslation('it', wmIT);
    this.setTranslation('en', wmEN);
    this.setTranslation('de', wmDE);
    this.setTranslation('fr', wmFR);
    this.setTranslation('pr', wmPR);
    this.setTranslation('es', wmES);
    this.setTranslation('sq', wmSQ);

    Object.keys(this.appTranslation).forEach(lang => {
      this.setTranslation(lang, this.appTranslation[lang], true);
    });

    this._confTRANSLATIONS
      .pipe(
        filter(f => f != null),
        take(1),
      )
      .subscribe((translations: {[lang: string]: {[key: string]: string}}) => {
        const langs = Object.keys(translations);
        langs.forEach(l => {
          if (translations[l] != null) {
            this.setTranslation(l, translations[l], true);
          }
        });
      });
    combineLatest([this._confLANGUAGES$, this._deviceService.getLanguageCode$()])
      .pipe(
        filter(([l]) => l != null),
        take(1),
      )
      .subscribe(([l, deviceLang]) => {
        if (l && l.available) {
          this.addLangs(l.available);
        }

        // Se la lingua del dispositivo è disponibile, usala come default
        if (deviceLang && l && l.available && l.available.includes(deviceLang)) {
          console.log('use device lang', deviceLang);
          this.setDefaultLang(deviceLang);
        } else if (l && l.default) {
          // Altrimenti usa la lingua di default dalla configurazione
          this.setDefaultLang(l.default);
        }

        this.useSavedLang();
        this.isInit$.next(true);
      });
  }

  useSavedLang(): string {
    const savedLang = localStorage.getItem('wm-lang');
    if (savedLang) {
      this.use(savedLang);
    }
    return savedLang;
  }

  override use(lang: string): any {
    localStorage.setItem('wm-lang', lang);
    super.use(lang);
  }

  override instant(
    key: string | Array<string> | {[lang: string]: string},
    interpolateParams?: Object,
  ): string | any {
    if (typeof key === 'object' && key.length === 0) return '';
    if (key[this.currentLang] != null) {
      return key[this.currentLang];
    }
    if (key[this.defaultLang]) {
      return key[this.defaultLang];
    }
    if (typeof key === 'string') {
      return super.instant(key);
    }

    if (key[0]) {
      return key[0];
    }
    // if defaultLang and currentLang no match inside object take the first
    for (const val in key) {
      if (key[val]) {
        return key[val];
      }
    }
    try {
      return super.instant(key as string | Array<string>, interpolateParams);
    } catch (e) {
      console.error(e);
    }
  }
}
