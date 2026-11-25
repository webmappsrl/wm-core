import {ChangeDetectorRef} from '@angular/core';
import {FormBuilder} from '@angular/forms';
import {TestBed} from '@angular/core/testing';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {Subject, firstValueFrom} from 'rxjs';
import {LangService} from '@wm-core/localization/lang.service';
import {UrlHandlerService} from '@wm-core/services/url-handler.service';
import {confMAPLayers, confShowRouteFilters} from '@wm-core/store/conf/conf.selector';
import {
  EmptyInputTyped,
  inputTyped,
  routeFilters,
} from '@wm-core/store/user-activity/user-activity.selector';
import {ILAYER} from '@wm-core/types/config';
import {WmSearchBarComponent} from './search-bar.component.camminiditalia';

/** `LangService` finto: lingua corrente, lingua di ripiego e i due eventi di cambio. */
interface FakeLang {
  currentLang: string | undefined;
  defaultLang: string | undefined;
  instant: (key: string) => string;
  onLangChange: Subject<unknown>;
  onFallbackLangChange: Subject<unknown>;
}

const LAYERS = [
  {
    id: 1,
    attributes: {
      taxonomy_where: [
        {value: 'sardinia', name: {it: 'Sardegna', en: 'Sardinia'}},
        {value: 'aosta-valley', name: {it: "Valle d'Aosta", en: 'Aosta Valley'}},
      ],
    },
  },
] as unknown as ILAYER[];

/**
 * Le etichette del filtro dei cammini seguono la lingua attiva anche quando l'utente non l'ha mai
 * scelta dal profilo, e si aggiornano al cambio lingua (oc:8958).
 */
describe('WmSearchBarComponent (camminiditalia) — lingua delle opzioni', () => {
  let lang: FakeLang;
  let component: WmSearchBarComponent;

  beforeEach(() => TestBed.resetTestingModule());
  afterEach(() => {
    component?.ngOnDestroy();
    TestBed.resetTestingModule();
  });

  /**
   * Crea il componente senza template: serve solo `options$`.
   *
   * @param currentLang Lingua scelta dal profilo, `undefined` se mai scelta.
   * @param defaultLang Lingua di ripiego (dispositivo o default della config).
   */
  function create(currentLang: string | undefined, defaultLang: string | undefined): void {
    lang = {
      currentLang,
      defaultLang,
      instant: (key: string) => key,
      onLangChange: new Subject(),
      onFallbackLangChange: new Subject(),
    };
    TestBed.configureTestingModule({providers: [provideMockStore()]});
    const store = TestBed.inject(MockStore);
    store.overrideSelector(confMAPLayers, LAYERS);
    store.overrideSelector(confShowRouteFilters, true);
    // La base della search-bar sottoscrive questi due selettori nel costruttore.
    store.overrideSelector(inputTyped, '');
    store.overrideSelector(EmptyInputTyped, false);
    store.overrideSelector(routeFilters, {});
    component = new WmSearchBarComponent(
      new FormBuilder(),
      store,
      {updateURL: () => {}} as unknown as UrlHandlerService,
      lang as unknown as LangService,
      {markForCheck: () => {}} as unknown as ChangeDetectorRef,
    );
  }

  /** Etichette correnti della riga Regioni. */
  async function regionLabels(): Promise<string[]> {
    const options = await firstValueFrom(component.options$);
    return options.regions.map(o => o.label);
  }

  it('uses the fallback language when no language was chosen', async () => {
    create(undefined, 'en');
    expect(await regionLabels()).toEqual(['Aosta Valley', 'Sardinia']);
  });

  it('recomputes the options when the language changes', async () => {
    create('it', 'it');
    const seen: string[][] = [];
    const sub = component.options$.subscribe(o => seen.push(o.regions.map(r => r.label)));

    lang.currentLang = 'en';
    lang.onLangChange.next({lang: 'en'});
    sub.unsubscribe();

    expect(seen[0]).toEqual(['Sardegna', "Valle d'Aosta"]);
    expect(seen[seen.length - 1]).toEqual(['Aosta Valley', 'Sardinia']);
  });

  it('recomputes the options when the fallback language arrives', async () => {
    create(undefined, 'it');
    const seen: string[][] = [];
    const sub = component.options$.subscribe(o => seen.push(o.regions.map(r => r.label)));

    lang.defaultLang = 'en';
    lang.onFallbackLangChange.next({lang: 'en'});
    sub.unsubscribe();

    expect(seen[seen.length - 1]).toEqual(['Aosta Valley', 'Sardinia']);
  });

  it('keeps the region values across a language change', async () => {
    create('it', 'it');
    const values: string[][] = [];
    const sub = component.options$.subscribe(o => values.push(o.regions.map(r => r.value)));

    lang.currentLang = 'en';
    lang.onLangChange.next({lang: 'en'});
    sub.unsubscribe();

    // L'ordine cambia con la lingua (si ordina per etichetta), l'insieme dei value no.
    expect([...values[0]].sort()).toEqual(['aosta-valley', 'sardinia']);
    expect([...values[values.length - 1]].sort()).toEqual(['aosta-valley', 'sardinia']);
  });
});
