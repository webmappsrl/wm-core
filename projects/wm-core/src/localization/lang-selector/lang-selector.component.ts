import {Component, ChangeDetectionStrategy, ViewEncapsulation} from '@angular/core';
import {UntypedFormBuilder, UntypedFormGroup} from '@angular/forms';
import {Store} from '@ngrx/store';
import {LangService} from '@wm-core/localization/lang.service';
import {confLANGUAGES} from '@wm-core/store/conf/conf.selector';
import {BehaviorSubject} from 'rxjs';
import {filter, take} from 'rxjs/operators';
@Component({
  selector: 'wm-lang-selector',
  templateUrl: './lang-selector.component.html',
  styleUrls: ['./lang-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmLangSelectorComponent {
  langs$: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
  languages$ = this._store.select(confLANGUAGES);
  langForm: UntypedFormGroup;

  constructor(
    private _fb: UntypedFormBuilder,
    private _langSvc: LangService,
    private _store: Store,
  ) {
    const lang = this._langSvc.useSavedLang() || this._langSvc.defaultLang;
    this.langForm = this._fb.group({
      lang,
    });
    this._langSvc.isInit$
      .pipe(
        filter(f => f == true),
        take(1),
      )
      .subscribe(() => {
        const lang = this._langSvc.useSavedLang() || this._langSvc.defaultLang;
        this.langForm.setValue({lang});
      });
    this.languages$
      .pipe(
        filter(l => l != null),
        take(1),
      )
      .subscribe(l => {
        if (l && l.available) {
          this.langs$.next(l.available);
        }
      });

    this.langForm.valueChanges.subscribe(lang => {
      this._langSvc.use(lang.lang);
    });
  }
}
