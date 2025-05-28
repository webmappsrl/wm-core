import { UntypedFormGroup, ValidationErrors } from "@angular/forms";

export function addFormError(form: UntypedFormGroup, error: ValidationErrors): void {
  form.setErrors({...(form.errors || {}), error});
}

export function removeFormError(form: UntypedFormGroup, errorKey: string): void {
  if (!form.errors || !form.errors.error) return;

  const currentErrors = {...form.errors.error};
  delete currentErrors[errorKey];

  // Se non ci sono più errori, rimuove l'oggetto `error`, altrimenti lo aggiorna
  if (Object.keys(currentErrors).length === 0) {
    const newErrors = {...form  .errors};
    delete newErrors.error;
    form.setErrors(Object.keys(newErrors).length ? newErrors : null);
  } else {
    form.setErrors({...form.errors, error: currentErrors});
  }
}