import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {provideMockStore, MockStore} from '@ngrx/store/testing';
import {Subject} from 'rxjs';
import {WmSelectNearbyLayerComponent} from './select-nearby-layer.component';
import {LangService} from '../../localization/lang.service';
import {confHOMELayers} from '../../store/conf/conf.selector';
import {ILAYER} from '@wm-core/types/config';
import {IonicModule} from '@ionic/angular';
import {CommonModule} from '@angular/common';
import {WmPipeModule} from '../../pipes/pipe.module';
import {currentEcLayer, nearbyLayerId} from '../../store/user-activity/user-activity.selector';

const MOCK_LAYERS: ILAYER[] = [
  {id: '35', title: 'Cammino di Tindari'} as ILAYER,
  {id: '81', title: 'Via dei Frati'} as ILAYER,
  {id: '110', title: 'Sulle orme di San Bernardo'} as ILAYER,
];

describe('WmSelectNearbyLayerComponent', () => {
  let component: WmSelectNearbyLayerComponent;
  let fixture: ComponentFixture<WmSelectNearbyLayerComponent>;
  let store: MockStore;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      declarations: [WmSelectNearbyLayerComponent],
      imports: [ReactiveFormsModule, IonicModule.forRoot(), CommonModule, WmPipeModule],
      providers: [
        provideMockStore({
          selectors: [
            {selector: confHOMELayers, value: MOCK_LAYERS},
            {selector: currentEcLayer, value: null},
            {selector: nearbyLayerId, value: null},
          ],
        }),
        {
          provide: LangService,
          useValue: {
            instant: (k: any) => (typeof k === 'string' ? k : k['it'] ?? ''),
            onLangChange: new Subject<void>().asObservable(),
          },
        },
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(WmSelectNearbyLayerComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => store?.resetSelectors());

  it('pre-seleziona currentEcLayer se presente nello store', () => {
    store.overrideSelector(currentEcLayer, {id: '81'} as any);
    store.refreshState();
    component.ngOnInit();
    fixture.detectChanges();
    expect(component.selectedLayer?.id).toBe('81');
    expect(component.searchText).toBe('Via dei Frati');
  });

  it('pre-seleziona il layer da nearbyLayerId store se currentEcLayer è null', () => {
    store.overrideSelector(nearbyLayerId, '35');
    store.refreshState();
    component.ngOnInit();
    fixture.detectChanges();
    expect(component.selectedLayer?.id).toBe('35');
    expect(component.searchText).toBe('Cammino di Tindari');
  });

  it('filtra i layer per titolo quando l utente digita', () => {
    component.ngOnInit();
    fixture.detectChanges();
    component.onInputChange('Tindari');
    fixture.detectChanges();
    expect(component.filteredLayers$.value.length).toBe(1);
    expect(component.filteredLayers$.value[0].id).toBe('35');
  });
});
