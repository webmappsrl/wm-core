import {
  EmptyInputTyped,
  inputTyped as inputTypedSelector,
} from '@wm-core/store/user-activity/user-activity.selector';
import {Subscription} from 'rxjs/internal/Subscription';
import {EventEmitter, Injectable, Input, Output, OnDestroy} from '@angular/core';
import {FormBuilder, FormGroup, FormControl} from '@angular/forms';
import {Store} from '@ngrx/store';
import {debounceTime, filter, distinctUntilChanged} from 'rxjs/operators';
import {inputTyped} from '@wm-core/store/user-activity/user-activity.action';
import {UrlHandlerService} from '@wm-core/services/url-handler.service';

interface SearchForm {
  search: FormControl<string>;
}

/**
 * Logica condivisa della search box (form, debounce, dispatch a `inputTyped`) tra il componente
 * di default `wm-searchbar` e la variante `.camminiditalia` (oc:8414, che aggiunge sopra la
 * ricerca il pannello filtri "Cerca il tuo cammino"). Classe plain, mai `@Component` — vive in un
 * terzo file mai soggetto a `fileReplacements` (pattern oc:8391, wm-home-layer): entrambe le
 * varianti la estendono, nessuna delle due la duplica.
 * `@Injectable()` obbligatorio: senza il decorator Angular non genera la factory DI (`ɵfac`) da
 * cui le sottoclassi ereditano i tipi dei parametri costruttore — assenza rilevabile solo a
 * runtime reale (`NG0202`), non dagli spec che istanziano il componente con `new` (oc:8391).
 */
@Injectable()
export abstract class SearchBarBaseComponent implements OnDestroy {
  private _searchSub$: Subscription = Subscription.EMPTY;
  private _inputTypedSub$: Subscription = Subscription.EMPTY;

  @Input('initSearch') set setSearch(init: string) {
    this.searchForm.controls.search.setValue(init);
  }

  @Output('isTypings') isTypingsEVT: EventEmitter<boolean> = new EventEmitter<boolean>(false);

  emptyInputTyped$ = this._store.select(EmptyInputTyped);
  searchForm: FormGroup<SearchForm>;

  constructor(
    fb: FormBuilder,
    protected _store: Store<any>,
    protected _urlHandlerSvc: UrlHandlerService,
  ) {
    this.searchForm = fb.group<SearchForm>({
      search: new FormControl<string>(''),
    });

    this._searchSub$ = this.searchForm.valueChanges.pipe(debounceTime(500)).subscribe(value => {
      const search = value.search;
      if (search != null && search !== '') {
        this._urlHandlerSvc.updateURL({search});
        this.isTypingsEVT.emit(true);
      } else {
        this._urlHandlerSvc.updateURL({search: undefined});
        this.isTypingsEVT.emit(false);
      }
    });
    this._store
      .select(EmptyInputTyped)
      .pipe(filter(f => f))
      .subscribe(() => {
        this.searchForm.reset();
        this.isTypingsEVT.emit(false);
      });
    this._inputTypedSub$ = this._store
      .select(inputTypedSelector)
      .pipe(distinctUntilChanged())
      .subscribe(value => {
        const currentValue = this.searchForm.controls.search.value;
        const newValue = value || '';
        if (currentValue !== newValue) {
          this.searchForm.controls.search.setValue(newValue);
        }
      });
  }

  ngOnDestroy(): void {
    this._searchSub$.unsubscribe();
    this._inputTypedSub$.unsubscribe();
  }

  /**
   * Resetta la search box, azzera `inputTyped` nello store ed emette `isTypings: false`.
   */
  reset(): void {
    this.searchForm.reset();
    this._store.dispatch(inputTyped({inputTyped: ''}));
    this.isTypingsEVT.emit(false);
  }
}
