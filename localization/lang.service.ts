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

    const savedLang = localStorage.getItem('wm-lang');
    if (savedLang) {
      this.use(savedLang);
    }

    this.setTranslation('it', wmIT);
    this.setTranslation('en', wmEN);
  }
}
