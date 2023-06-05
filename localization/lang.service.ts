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
import {setUserProjection} from 'ol/proj';

@Injectable()
export class LangService extends TranslateService implements TranslateService {
  constructor(
    public store: TranslateStore,
    public currentLoader: TranslateLoader,
    public compiler: TranslateCompiler,
    public parser: TranslateParser,
    public missingTranslationHandler: MissingTranslationHandler,
    @Inject(USE_DEFAULT_LANG) useDefaultLang: boolean = true,
    @Inject(USE_STORE) isolate: boolean = false,
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
    this.setTranslation('it', wmIT);
    this.setTranslation('en', wmEN);
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

  instant(
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
