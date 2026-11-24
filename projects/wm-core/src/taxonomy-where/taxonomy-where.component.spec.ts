import {ComponentFixture, TestBed} from '@angular/core/testing';
import {WmTaxonomyWhereComponent} from './taxonomy-where.component';
import v1Fixture from '../utils/fixtures/aws-version-adapter/forestasdev-769-v1.json';
import unversionedFixture from '../utils/fixtures/aws-version-adapter/forestasdev-769-unversioned.json';

describe('WmTaxonomyWhereComponent', () => {
  let fixture: ComponentFixture<WmTaxonomyWhereComponent>;
  let component: WmTaxonomyWhereComponent;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({declarations: [WmTaxonomyWhereComponent]});
    // Il test riguarda i computed: il template (pipe wmtrans, componenti Ionic) non serve.
    TestBed.overrideComponent(WmTaxonomyWhereComponent, {set: {template: ''}});
    fixture = TestBed.createComponent(WmTaxonomyWhereComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => TestBed.resetTestingModule());

  it('con wheres raggruppa per admin_level', () => {
    fixture.componentRef.setInput('wheres', (v1Fixture as any).properties.taxonomies.where);
    expect(component.regionWheres().map(w => w.label)).toEqual([{en: 'Sardegna'}]);
    expect(component.provinceWheres().map(w => w.label)).toEqual([{en: 'Nuoro'}]);
    expect(component.municipalityWheres().map(w => w.label)).toEqual([{en: 'Fonni'}]);
  });

  it('gli elementi senza admin_level sono scartati', () => {
    fixture.componentRef.setInput('wheres', (v1Fixture as any).properties.taxonomies.where);
    const labels = [
      ...component.regionWheres(),
      ...component.provinceWheres(),
      ...component.municipalityWheres(),
    ].map(w => JSON.stringify(w.label));
    expect(labels.length).toBe(3);
    expect(labels.join()).not.toContain('Area T (Centrale)');
    expect(labels.join()).not.toContain('ZNUT7');
    expect(component.hasWhereInfo()).toBeTrue();
  });

  it('con la sola mappa taxonomyWheres funziona come oggi', () => {
    fixture.componentRef.setInput(
      'taxonomyWheres',
      (unversionedFixture as any).properties.taxonomy_where,
    );
    expect(component.regionWheres().map(w => w.label)).toEqual([{en: 'Sardegna'}]);
    expect(component.provinceWheres().map(w => w.label)).toEqual([{en: 'Nuoro'}]);
    expect(component.municipalityWheres().map(w => w.label)).toEqual([{en: 'Fonni'}]);
  });
});
