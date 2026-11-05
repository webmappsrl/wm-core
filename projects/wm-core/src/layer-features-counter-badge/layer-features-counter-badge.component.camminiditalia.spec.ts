import {CommonModule} from '@angular/common';
import {Pipe, PipeTransform} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideMockStore, MockStore} from '@ngrx/store/testing';
import {confMAPLayers} from '@wm-core/store/conf/conf.selector';
import {
  layerFeaturesCount,
  layerFeaturesTotalCount,
} from '@wm-core/store/features/ec/ec.selector';
import {WmLayerFeaturesCounterBadgeComponent} from './layer-features-counter-badge.component.camminiditalia';

@Pipe({standalone: false, name: 'wmtrans'})
class FakeWmTransPipe implements PipeTransform {
  transform(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }
}

describe('WmLayerFeaturesCounterBadgeComponent (camminiditalia)', () => {
  let fixture: ComponentFixture<WmLayerFeaturesCounterBadgeComponent>;
  let store: MockStore;

  const setup = (layers: any[] | undefined, counts = {5: {tracks: 12, pois: 3}}): void => {
    store.overrideSelector(layerFeaturesCount, counts as any);
    store.overrideSelector(layerFeaturesTotalCount, counts as any);
    store.overrideSelector(confMAPLayers, layers as any);
    store.refreshState();
    fixture.componentInstance.layerId = '5';
    fixture.detectChanges();
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
  });

  it('mostra stage_count del layer al posto del conteggio delle tracce', () => {
    setup([{id: 5, attributes: {stage_count: 10}}]);
    expect(text()).toContain('10');
    expect(text()).not.toContain('12');
    expect(text()).toContain('Sentieri');
  });

  it('mantiene il conteggio dei POI', () => {
    setup([{id: 5, attributes: {stage_count: 10}}]);
    expect(text()).toContain('3');
    expect(text()).toContain('Punti di interesse');
  });

  it('layer senza stage_count: conteggio di Elastic', () => {
    setup([{id: 5, attributes: {}}]);
    expect(text()).toContain('12');
  });

  it('layer assente dalla config: conteggio di Elastic', () => {
    setup([{id: 99, attributes: {stage_count: 10}}]);
    expect(text()).toContain('12');
    expect(text()).not.toContain('10');
  });

  it('config senza layers: conteggio di Elastic', () => {
    setup(undefined);
    expect(text()).toContain('12');
  });
});
