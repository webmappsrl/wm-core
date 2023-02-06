import {Component, ChangeDetectionStrategy, Input, ViewEncapsulation} from '@angular/core';
import {FormBuilder, FormGroup} from '@angular/forms';
import {LangService} from '../lang.service';
@Component({
  selector: 'wm-lang-selector',
  templateUrl: './lang-selector.component.html',
  styleUrls: ['./lang-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmLangSelectorComponent {
  private _langs: string[] = [];

  @Input() set defaultLang(lang: string) {
    if (lang != null) {
      this._langSvc.setDefaultLang(lang);
    }
  }

  @Input() set langs(langs: string[]) {
    if (langs != null && langs.length > 0) {
      this._langSvc.addLangs(langs);
      this._langs = langs;
    }
  }

  get langs() {
    return this._langs;
  }

  langForm: FormGroup;

  constructor(private _fb: FormBuilder, private _langSvc: LangService) {
    const lang = this._langSvc.currentLang || this._langSvc.defaultLang;
    this.langForm = this._fb.group({
      lang,
    });
    this.langForm.valueChanges.subscribe(lang => {
      this._langSvc.use(lang.lang);
      localStorage.setItem('wm-lang', lang.lang);
    });
  }
}
