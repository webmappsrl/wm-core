import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import {UntypedFormBuilder, UntypedFormGroup, Validators} from '@angular/forms';
import {BehaviorSubject} from 'rxjs';
import {distinctUntilChanged, filter} from 'rxjs/operators';

@Component({
  selector: 'wm-form',
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmFormComponent {
  private _currentFormId = 0;

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
      this.setForm(values.index ?? values.formId, values);
    }
  }

  get formId(): number {
    return this._currentFormId;
  }

  @Input() disabled: boolean = false;
  @Output() formGroupEvt: EventEmitter<UntypedFormGroup> = new EventEmitter<UntypedFormGroup>();

  currentForm$: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  enableForm$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  formGroup: UntypedFormGroup;
  formIdGroup: UntypedFormGroup;
  forms$: BehaviorSubject<any[]> = new BehaviorSubject<any>([]);

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
        }
      });
  }

  setForm(idx = 0, values?: any): void {
    if (typeof idx != 'number') {
      idx = this.forms$.value.findIndex(elem => elem.id === idx);
    }
    this._currentFormId = idx;
    this.formIdGroup.controls['id'].setValue(idx);
    this.currentForm$.next(this.forms$.value[idx]);
    let formObj = {};

    this.currentForm$.value.fields.forEach(field => {
      const validators = [];
      if (field.required) {
        validators.push(Validators.required);
      }
      if (field.type === 'text') {
        formObj[field.name] = [
          values && values[field.name] ? values[field.name] : null,
          validators,
        ];
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
      if (values) {
        this.formGroup.markAsDirty();
      }
      this.formGroupEvt.emit(this.formGroup);
    });
  }
}
