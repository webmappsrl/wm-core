import {Subscription} from 'rxjs/internal/Subscription';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnDestroy,
  ViewEncapsulation,
  ChangeDetectionStrategy,
} from '@angular/core';
import {FormBuilder, FormGroup, FormControl} from '@angular/forms';
import {Store} from '@ngrx/store';
import {debounceTime} from 'rxjs/operators';
import {inputTyped} from '@wm-core/store/user-activity/user-activity.action';

interface SearchForm {
  search: FormControl<string>;
}

@Component({
  selector: 'wm-searchbar',
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WmSearchBarComponent implements OnDestroy {
  private _searchSub$: Subscription = Subscription.EMPTY;

  @Input('initSearch') set setSearch(init: string) {
    this.searchForm.controls.search.setValue(init);
  }

  @Output('isTypings') isTypingsEVT: EventEmitter<boolean> = new EventEmitter<boolean>(false);
  @Output('words') wordsEVT: EventEmitter<string> = new EventEmitter<string>(false);

  searchForm: FormGroup<SearchForm>;

  constructor(fb: FormBuilder, private _store: Store<any>) {
    this.searchForm = fb.group<SearchForm>({
      search: new FormControl<string>(''),
    });
    /**
     * This code is subscribing to a searchForm valueChanges observable.
     * It is using the debounceTime operator to wait 500 milliseconds before emitting the value from the observable.
     * If the words and search are not null and the search is not an empty string,
     * it dispatches a query action with either the inputTyped and layer or just the inputTyped.
     * It then emits two events, one for isTypingsEVT with a boolean value of true, and one for wordsEVT
     * with the words.search as its value. If the words and search are null or an empty string,
     * it emits an event for isTypingsEVT with a boolean value of false.
     **/
    this._searchSub$ = this.searchForm.valueChanges.pipe(debounceTime(500)).subscribe(value => {
      const search = value.search;
      if (search != null && search !== '') {
        this._store.dispatch(inputTyped({inputTyped: search}));
        this.isTypingsEVT.emit(true);
        this.wordsEVT.emit(search);
      } else {
        this.isTypingsEVT.emit(false);
      }
    });
  }

  ngOnDestroy(): void {
    this._searchSub$.unsubscribe();
  }

  /**
   * @description
   * This function is a member of a class and is used to reset the searchForm,
   * emit an empty string to the wordsEVT event, and emit false to the isTypingsEVT event.
   * @memberof SearchBarComponent
   */
  reset(): void {
    this.searchForm.reset();
    this._store.dispatch(inputTyped({inputTyped: ''}));
    this.wordsEVT.emit('');
    this.isTypingsEVT.emit(false);
  }
}
