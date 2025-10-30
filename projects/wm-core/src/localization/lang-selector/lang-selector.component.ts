import {Component, ChangeDetectionStrategy, ViewEncapsulation} from '@angular/core';
import {AlertController} from '@ionic/angular';
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
    private _alertCtrl: AlertController,
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

  async langBtnClick(): Promise<void> {
    const available = this.langs$.value || [];
    if (!available.length) return;
    const current = this.langForm.value?.lang;
    const alert = await this._alertCtrl.create({
      header: this._langSvc.instant('Lingua'),
      inputs: available.map(l => ({
        type: 'radio',
        label: l,
        value: l,
        checked: l === current,
      })),
      buttons: [
        {text: this._langSvc.instant('Annulla'), role: 'cancel'},
        {
          text: this._langSvc.instant('OK'),
          role: 'confirm',
          handler: (value: string) => {
            if (value && value !== current) {
              this.langForm.setValue({lang: value});
            }
          },
        },
      ],
    });
    await alert.present();
  }
}
