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

    this.setTranslation('en', wmEN);
  }

  initLang(defLang: string): void {
    console.log('init lang');
    if (defLang) {
      this.setDefaultLang(defLang);
    }
    switch (defLang) {
      case 'it':
      default:
        this.setTranslation(defLang, wmIT);
        break;
      case 'en':
        this.setTranslation('en', wmEN);
        break;
    }

    const savedLang = localStorage.getItem('wm-lang');
    if (savedLang) {
      this.use(savedLang);
    } else {
      this.use(defLang);
    }
  }

  setTranslation(lang: string, translations: Object, shouldMerge?: boolean): void {
    const wmCoreLangs = {'it': wmIT, 'en': wmEN};
    if (wmCoreLangs[lang] != null) {
      super.setTranslation(lang, wmCoreLangs[lang], true);
    }

    super.setTranslation(lang, translations, shouldMerge);
  }
}
