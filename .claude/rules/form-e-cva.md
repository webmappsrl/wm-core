---
paths:
  - "projects/wm-core/src/form/**"
---

# Trappole: `WmFormComponent` e i ControlValueAccessor

Contesto e perché: [docs/knowledge/ugc.md](../../docs/knowledge/ugc.md).

- **In `setForm()` il form group va costruito dopo il `forEach`, non dentro.**
  `this.formGroup = this._fb.group(formObj)`, `formGroupEvt.emit` e `isInvalidEvt.emit` stanno
  **fuori** dal ciclo sui campi; dentro si accumula solo `formObj[field.name]`.
- **Usa `takeUntil(this._destroy$)` per ogni subscription**, sia di `formIdGroup.valueChanges`
  sia di `formGroup.valueChanges`. La gestione manuale con `Subscription` perdeva memoria: al
  cambio form le vecchie `valueChanges` non venivano mai chiuse.
- **`confPOIFORMS` accetta `null` di proposito** (`any[] | null`, con guard `if (forms == null)
  return`): in strict template `X | async` produce `T | null`, e tutti i template che usano
  `[confPOIFORMS]="obs$|async"` senza `?? []` dipendono da questo. Non stringere il tipo.
- **Un CVA deve propagare il valore anche a form ricreato.** Quando `setForm()` ricostruisce il
  `FormGroup`, Angular chiama `registerOnChange(newFn)`: se l'observable a monte non ri-emette,
  la nuova funzione non viene mai invocata e il valore preselezionato si perde. `registerOnChange`
  deve propagare subito il valore già risolto, e la preselezione deve chiamare `_onChange` sempre,
  non solo quando il valore cambia visivamente.
- **`layer_id` va estratto in tutti i componenti di salvataggio**, non solo in uno: il flusso POI
  segnalazione usa `ModalSaveComponent`, non `ModalUgcUploaderComponent`. Entrambi devono usare
  `...(formValue?.layer_id != null && {layer_id: formValue.layer_id})`, per non inviare
  `layer_id: null` al backend.
