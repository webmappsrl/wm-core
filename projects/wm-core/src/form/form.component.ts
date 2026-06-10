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
import {BehaviorSubject, Subject} from 'rxjs';
import {distinctUntilChanged, filter, takeUntil} from 'rxjs/operators';

@Component({
  standalone: false,
  selector: 'wm-form',
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmFormComponent implements OnDestroy {
  private _currentFormId = 0;
  private _destroy$ = new Subject<void>();
  private _titleFirstClick = true;

  @Input() set confPOIFORMS(forms: any[] | null) {
    if (forms == null) return;
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
  constructor(private _fb: UntypedFormBuilder) {
    this.formIdGroup = this._fb.group({
      id: [null, [Validators.required]],
    });
    this.formIdGroup.valueChanges
      .pipe(
        filter(form => form != null && form.id != null),
        distinctUntilChanged((prev, curr) => prev.id === curr.id),
        takeUntil(this._destroy$),
      )
      .subscribe(form => {
        this.enableForm$.next(false);
        this.setForm(form.id);
        this.enableForm$.next(true);
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
    const formObj: Record<string, any> = {
      index: idx,
      id: this.currentForm$.value.id,
    };

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
      if (field.type === 'selectNearLayer') {
        formObj[field.name] = [
          values && values[field.name] ? values[field.name] : null,
          validators,
        ];
      }
    });

    this.formGroup = this._fb.group(formObj);
    this.formGroup.valueChanges.pipe(takeUntil(this._destroy$)).subscribe(() => {
      this.isInvalidEvt.emit(this.formGroup.invalid);
    });
    this.formGroupEvt.emit(this.formGroup);
    this.isInvalidEvt.emit(this.formGroup.invalid);
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  async selectAllTitleText(event: any): Promise<void> {
    if (!this._titleFirstClick) {
      return;
    }

    const target = event?.target as HTMLIonInputElement | null;
    if (target?.getInputElement) {
      const nativeInput = await target.getInputElement();
      nativeInput?.select();
    }
    this._titleFirstClick = false;
  }

  capitalizeTitle(event: any) {
    const inputValue = event?.detail?.value ?? event?.target?.value;
    if (inputValue && inputValue.length === 1) {
      const capitalizedValue = inputValue.toUpperCase();
      this.formGroup.get('title')?.setValue(capitalizedValue, {emitEvent: false});
    }
  }
}
