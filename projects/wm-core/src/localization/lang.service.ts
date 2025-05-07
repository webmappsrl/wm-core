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
  USE_DEFAULT_LANG,
  USE_STORE,
} from '@ngx-translate/core';
import {wmIT} from './i18n/it';
import {wmEN} from './i18n/en';
import {wmDE} from './i18n/de';
import {wmFR} from './i18n/fr';
import {wmPR} from './i18n/pr';
import {wmES} from './i18n/es';
import {wmSQ} from './i18n/sq';
import {Store} from '@ngrx/store';
import {confTRANSLATIONS} from '@wm-core/store/conf/conf.selector';
import {filter, take} from 'rxjs/operators';
import {APP_TRANSLATION} from '@wm-core/store/conf/conf.token';
import {WmTranslations} from '@wm-types/language';
@Injectable({
  providedIn: 'root',
})
export class LangService extends TranslateService implements TranslateService {
  private _confTRANSLATIONS = this._store.select(confTRANSLATIONS);

  constructor(
    public override store: TranslateStore,
    public override currentLoader: TranslateLoader,
    public override compiler: TranslateCompiler,
    public override parser: TranslateParser,
    public override missingTranslationHandler: MissingTranslationHandler,
    @Inject(USE_DEFAULT_LANG) useDefaultLang: boolean = true,
    @Inject(USE_STORE) isolate: boolean = false,
    @Inject(APP_TRANSLATION) public appTranslation: WmTranslations,
    private _store: Store<any>,
  ) {
    super(
      store,
      currentLoader,
      compiler,
      parser,
      missingTranslationHandler,
      useDefaultLang,
      isolate,
      true,
      'it',
    );
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
        if (translations['it'] != null) {
          this.setTranslation('it', translations['it'], true);
        }
        if (translations['en'] != null) {
          this.setTranslation('en', translations['en'], true);
        }
      });
  }

  initLang(defLang: string): void {
    if (defLang) {
      this.setDefaultLang(defLang);
    }

    const savedLang = localStorage.getItem('wm-lang');
    if (savedLang) {
      this.use(savedLang);
    } else {
      localStorage.setItem('wm-lang', defLang);
      this.use(defLang);
    }
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
