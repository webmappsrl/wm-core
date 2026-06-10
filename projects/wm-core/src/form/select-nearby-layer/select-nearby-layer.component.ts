import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  forwardRef,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
import {IonInput} from '@ionic/angular';
import {Store} from '@ngrx/store';
import {BehaviorSubject, combineLatest, Subject} from 'rxjs';
import {distinctUntilChanged, takeUntil} from 'rxjs/operators';
import {confHOMELayers} from '../../store/conf/conf.selector';
import {currentEcLayer} from '../../store/user-activity/user-activity.selector';
import {nearbyLayerId} from '../../store/user-activity/user-activity.selector';
import {LangService} from '../../localization/lang.service';
import {ILAYER} from '@wm-core/types/config';

@Component({
  standalone: false,
  selector: 'wm-select-nearby-layer',
  templateUrl: './select-nearby-layer.component.html',
  styleUrls: ['./select-nearby-layer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => WmSelectNearbyLayerComponent),
      multi: true,
    },
  ],
})
export class WmSelectNearbyLayerComponent
  implements ControlValueAccessor, OnInit, AfterViewInit, OnDestroy
{
  @ViewChild(IonInput) private _ionInput?: IonInput;

  private _destroy$ = new Subject<void>();
  private _onChange: (value: string | null) => void = () => {};
  private _onTouched: () => void = () => {};
  private _allLayers: ILAYER[] = [];
  private _pendingControlValue: string | null = null;
  private _lastResolvedLayer: ILAYER | null = null;

  searchText = '';
  selectedLayer: ILAYER | null = null;

  readonly filteredLayers$ = new BehaviorSubject<ILAYER[]>([]);
  readonly showDropdown$ = new BehaviorSubject<boolean>(false);

  constructor(
    private _store: Store,
    private _langSvc: LangService,
    private _cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    combineLatest([
      this._store.select(confHOMELayers),
      this._store.select(currentEcLayer),
      this._store.select(nearbyLayerId),
    ])
      .pipe(takeUntil(this._destroy$))
      .subscribe(([homeLayers, current, nearbyId]) => {
        this._allLayers = homeLayers ?? [];
        this.filteredLayers$.next(this._allLayers);
        this._tryApplyPendingControlValue();

        const layer = this._resolvePreselectionLayer(current, nearbyId);
        this._lastResolvedLayer = layer;
        if (layer != null) {
          this._applyPreselection(layer);
        }
      });
  }

  ngAfterViewInit(): void {
    void this._syncInputElement();
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  onInputChange(value: string | null | undefined): void {
    const next = value ?? '';
    this.searchText = next;
    this.showDropdown$.next(true);
    if (next === '' && this.selectedLayer != null) {
      this._select(null);
      this.filteredLayers$.next(this._allLayers);
    } else if (next) {
      const q = next.toLowerCase();
      this.filteredLayers$.next(
        this._allLayers.filter(l =>
          this._langSvc.instant(l.title as any).toLowerCase().includes(q),
        ),
      );
    } else {
      this.filteredLayers$.next(this._allLayers);
    }
    this._cdr.markForCheck();
  }

  onInputFocus(): void {
    this.showDropdown$.next(true);
  }

  selectLayer(layer: ILAYER): void {
    this._applyPreselection(layer);
    this.showDropdown$.next(false);
    this._onTouched();
  }

  writeValue(value: string | null): void {
    if (value == null) {
      return;
    }
    this._pendingControlValue = value;
    this._tryApplyPendingControlValue();
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this._onChange = fn;
    if (this._lastResolvedLayer != null) {
      this._onChange(this._lastResolvedLayer.id ?? null);
    }
  }

  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  onBlur(): void {
    setTimeout(() => {
      this.showDropdown$.next(false);
      this._cdr.markForCheck();
    }, 150);
  }

  private _tryApplyPendingControlValue(): void {
    if (this._pendingControlValue == null || !this._allLayers.length) {
      return;
    }
    const match = this._allLayers.find(
      l => String(l.id) === String(this._pendingControlValue),
    );
    if (match != null) {
      this._applyPreselection(match);
      this._pendingControlValue = null;
    }
  }

  private _resolvePreselectionLayer(
    current: ILAYER | null | undefined,
    nearbyId: string | null,
  ): ILAYER | null {
    if (!this._allLayers.length) {
      return null;
    }

    if (current != null) {
      const match = this._allLayers.find(l => String(l.id) === String(current.id));
      if (match != null) {
        return match;
      }
    }

    if (nearbyId != null) {
      return this._allLayers.find(l => String(l.id) === String(nearbyId)) ?? null;
    }

    return null;
  }

  private _applyPreselection(layer: ILAYER): void {
    const title = this._langSvc.instant(layer.title as any);
    const uiChanged =
      String(this.selectedLayer?.id) !== String(layer.id) || this.searchText !== title;

    this.selectedLayer = layer;
    this._onChange(layer.id ?? null);

    if (uiChanged) {
      this.searchText = title;
      this._cdr.markForCheck();
      void this._syncInputElement();
    }
  }

  private _select(layer: ILAYER | null): void {
    this.selectedLayer = layer;
    this._onChange(layer?.id ?? null);
    this._cdr.markForCheck();
  }

  private async _syncInputElement(): Promise<void> {
    const input = this._ionInput;
    if (input == null) {
      return;
    }
    try {
      const native = await input.getInputElement();
      if (native != null && native.value !== this.searchText) {
        native.value = this.searchText;
      }
    } catch {
      // ion-input non ancora pronto
    }
  }
}
