import {CommonModule} from '@angular/common';
import {Pipe, PipeTransform} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideMockStore, MockStore} from '@ngrx/store/testing';
import {
  layerFeaturesCount,
  layerFeaturesTotalCount,
} from '@wm-core/store/features/ec/ec.selector';
import {WmLayerFeaturesCounterBadgeComponent} from './layer-features-counter-badge.component';

@Pipe({standalone: false, name: 'wmtrans'})
class FakeWmTransPipe implements PipeTransform {
  transform(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }
}

describe('WmLayerFeaturesCounterBadgeComponent', () => {
  let fixture: ComponentFixture<WmLayerFeaturesCounterBadgeComponent>;
  let component: WmLayerFeaturesCounterBadgeComponent;
  let store: MockStore;

  const setup = (counts: Record<string, {tracks?: number; pois?: number}>): void => {
    store.overrideSelector(layerFeaturesCount, counts as any);
    store.overrideSelector(layerFeaturesTotalCount, counts as any);
    store.refreshState();
  };
  const text = (): string => fixture.nativeElement.textContent;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      declarations: [WmLayerFeaturesCounterBadgeComponent, FakeWmTransPipe],
      imports: [CommonModule],
      providers: [provideMockStore()],
    }).compileComponents();
    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(WmLayerFeaturesCounterBadgeComponent);
    component = fixture.componentInstance;
    component.layerId = '5';
  });

  it('mostra il conteggio di Elastic', () => {
    setup({5: {tracks: 12}});
    fixture.detectChanges();
    expect(text()).toContain('12');
  });

  it('il conteggio dei POI resta', () => {
    setup({5: {tracks: 12, pois: 3}});
    fixture.detectChanges();
    expect(text()).toContain('12');
    expect(text()).toContain('3');
    expect(text()).toContain('Punti di interesse');
  });
});
