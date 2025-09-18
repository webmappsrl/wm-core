import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import {UntypedFormBuilder, UntypedFormGroup, Validators} from '@angular/forms';
import {BehaviorSubject, Subscription} from 'rxjs';
import {distinctUntilChanged, filter} from 'rxjs/operators';

@Component({
  selector: 'wm-form',
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmFormComponent implements OnDestroy {
  private _currentFormId = 0;
  private _titleFirstClick = true;

  @Input() set confPOIFORMS(forms: any[]) {
    this.forms$.next(forms);
    if (forms.length === 1) {
      this.formIdGroup.controls['id'].setValue(0);
    }
  }

  @Input() set formId(id: any) {
    this.setForm(id, this.forms$.value[id]);
  }

  @Input() set init(values: any) {
    if (values != null) {
      this.setForm(values.formId ?? values.index, values);
    }
  }

  get formId(): number {
    return this._currentFormId;
  }

  @Input() disabled: boolean = false;
  @Output() formGroupEvt: EventEmitter<UntypedFormGroup> = new EventEmitter<UntypedFormGroup>();
  @Output() isInvalidEvt: EventEmitter<boolean> = new EventEmitter<boolean>();
  currentForm$: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  enableForm$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  formGroup: UntypedFormGroup;
  formIdGroup: UntypedFormGroup;
  forms$: BehaviorSubject<any[]> = new BehaviorSubject<any>([]);
  formGroupValueChangesSub: Subscription = Subscription.EMPTY;
  constructor(private _fb: UntypedFormBuilder) {
    this.formIdGroup = this._fb.group({
      id: [null, [Validators.required]],
    });
    this.formIdGroup.valueChanges
      .pipe(
        filter(form => form != null && form.id != null),
        distinctUntilChanged((prev, curr) => prev.id === curr.id),
      )
      .subscribe(form => {
        this.enableForm$.next(false);
        if (form.id != null) {
          this.setForm(form.id);
          this.enableForm$.next(true);
          this.formGroupValueChangesSub = this.formGroup.valueChanges.subscribe(() => {
            this.isInvalidEvt.emit(this.formGroup.invalid);
          });
        }
      });
  }

  setForm(idx = 0, values?: any): void {
    if (typeof idx != 'number') {
      idx = this.forms$.value.findIndex(elem => elem.id === idx);
    }
    this._currentFormId = idx;
    this._titleFirstClick = true;
    this.formIdGroup.controls['id'].setValue(idx);
    this.currentForm$.next(this.forms$.value[idx]);
    let formObj = {};

    this.currentForm$.value?.fields.forEach(field => {
      const validators = [];
      if (field.required) {
        validators.push(Validators.required);
      }
      if (field.type === 'text') {
        let defaultValue = null;

        if (field.name === 'title') {
          if (values && values[field.name]) {
            defaultValue = values[field.name];
          } else {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            defaultValue = `${this.currentForm$.value.id} ${year}/${month}/${day} ${hours}:${minutes}`;
          }
        } else {
          defaultValue = values && values[field.name] ? values[field.name] : null;
        }

        formObj[field.name] = [defaultValue, validators];
      }
      if (field.type === 'textarea') {
        formObj[field.name] = [values && values[field.name] ? values[field.name] : '', validators];
      }
      if (field.type === 'select') {
        formObj[field.name] = [
          values && values[field.name] ? values[field.name] : field.values[0].value,
          validators,
        ];
      }
      formObj['index'] = idx;
      formObj['id'] = this.currentForm$.value.id;
      this.formGroup = this._fb.group(formObj);
      this.formGroupEvt.emit(this.formGroup);
      this.isInvalidEvt.emit(this.formGroup.invalid);
    });
  }

  ngOnDestroy(): void {
    this.formGroupValueChangesSub.unsubscribe();
  }

  selectAllTitleText(event: any): void {
    if (this._titleFirstClick) {
      const input = event.target;
      if (input && input.select) {
        input.select();
      }
      this._titleFirstClick = false;
    }
  }

  capitalizeTitle(event: any) {
    const inputValue = event.target.value;
    if (inputValue && inputValue.length === 1) {
      const capitalizedValue = inputValue.toUpperCase();
      this.formGroup.get('title')?.setValue(capitalizedValue, {emitEvent: false});
    }
  }
}
