import {NO_ERRORS_SCHEMA} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {LangService} from '@wm-core/localization/lang.service';
import {
  PassportStageDetailHost,
  WmPassportStageDetailComponent,
} from './passport-stage-detail.component';
import {FakeTransPipe, fakeLangService} from '../testing/fake-trans';

describe('WmPassportStageDetailComponent (oc:8676, oc:8702)', () => {
  const completed = {
    trackId: 203,
    name: {it: 'Cammino Grande di Celestino - Tappa 06: Pacentro - Caramanico Terme'},
    status: 'completed',
    distance: 19.5,
    source: 'manual',
    completedAt: '2026-09-30T14:45:55+00:00',
  } as any;
  const notStarted = {trackId: 215, name: {it: 'Tappa 11'}, status: 'not_started', distance: 0} as any;

  let fixture: ComponentFixture<WmPassportStageDetailComponent>;
  let cmp: WmPassportStageDetailComponent;
  let host: jasmine.SpyObj<PassportStageDetailHost>;

  /** Il traduttore finto restituisce la chiave con i parametri sostituiti, come `wmtrans`. */
  const lang = fakeLangService();

  beforeEach(() => {
    TestBed.resetTestingModule();
    host = jasmine.createSpyObj('PassportStageDetailHost', ['back', 'openSharePreview']);
    host.openSharePreview.and.resolveTo();
    TestBed.configureTestingModule({
      declarations: [WmPassportStageDetailComponent, FakeTransPipe],
      providers: [
        {provide: LangService, useValue: lang},
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  /**
   * Crea la pagina con la tappa data e la renderizza.
   *
   * @param stage Tappa da mostrare.
   * @returns Il componente.
   */
  function render(stage: any): WmPassportStageDetailComponent {
    fixture = TestBed.createComponent(WmPassportStageDetailComponent);
    cmp = fixture.componentInstance;
    cmp.stage = stage;
    cmp.layerTitle = 'Cammino Grande di Celestino';
    cmp.host = host;
    fixture.detectChanges();
    return cmp;
  }

  const el = (): HTMLElement => fixture.nativeElement;
  const shareButton = (): HTMLButtonElement | null =>
    el().querySelector('.wm-passport-stage-detail-share');
  const rows = (): string[] =>
    Array.from(el().querySelectorAll('.wm-passport-stage-detail-row')).map(r =>
      Array.from(r.children)
        .map(c => (c.textContent ?? '').trim())
        .join(' '),
    );

  describe('contenuto (oc:8676)', () => {
    it('tappa percorsa: chip con la data, come nel wireframe («percorsa il 30 set»)', () => {
      render(completed);

      expect(cmp.done).toBeTrue();
      expect(cmp.chipLabel).toBe('percorsa il 30 set');
    });

    it('tappa non percorsa: chip senza data', () => {
      render(notStarted);

      expect(cmp.done).toBeFalse();
      expect(cmp.chipLabel).toBe('non ancora percorsa');
    });

    it("la distanza si mostra solo se il dato c'è", () => {
      expect(render(notStarted).showDistance).toBeFalse();
      expect(render(completed).showDistance).toBeTrue();
    });

    it('il nome è quello della lingua corrente', () => {
      expect(render(completed).title).toBe(
        'Cammino Grande di Celestino - Tappa 06: Pacentro - Caramanico Terme',
      );
    });
  });

  describe('foto e dislivelli (oc:8702)', () => {
    it('la riga della distanza usa l\'etichetta «Lunghezza»', () => {
      render(completed);

      expect(rows()).toContain('Lunghezza 19.5 Km');
      expect(rows().some(r => r.startsWith('Distanza'))).toBeFalse();
    });

    it('senza image il blocco foto non c\'è', () => {
      render(completed);

      expect(el().querySelector('.wm-passport-stage-detail-photo')).toBeNull();
    });

    it('con image la foto c\'è, e sparisce su un errore di caricamento', () => {
      render({...completed, image: 'https://wmfe/thumb.jpg'});
      const img = el().querySelector('.wm-passport-stage-detail-photo') as HTMLImageElement;

      expect(img).not.toBeNull();
      expect(img.getAttribute('src')).toBe('https://wmfe/thumb.jpg');

      img.dispatchEvent(new Event('error'));
      fixture.detectChanges();

      expect(el().querySelector('.wm-passport-stage-detail-photo')).toBeNull();
    });

    it('ascent 290 mostra «Dislivello positivo 290 m»; senza descent la riga non c\'è', () => {
      render({...completed, ascent: 290});

      expect(rows()).toContain('Dislivello positivo 290 m');
      expect(rows().some(r => r.startsWith('Dislivello negativo'))).toBeFalse();
    });

    it('descent 284 mostra «Dislivello negativo 284 m»; ascent 0 non mostra la riga', () => {
      render({...completed, ascent: 0, descent: 284});

      expect(rows()).toContain('Dislivello negativo 284 m');
      expect(rows().some(r => r.startsWith('Dislivello positivo'))).toBeFalse();
    });
  });

  describe('pulsante «Condividi» (oc:8702)', () => {
    it('con shareable il pulsante c\'è, con testo e icona', () => {
      render({...completed, shareable: true});

      expect(shareButton()).not.toBeNull();
      expect(shareButton()!.textContent).toContain('Condividi');
      expect(shareButton()!.querySelector('ion-icon')).not.toBeNull();
    });

    it('senza shareable non c\'è, anche se la tappa è percorsa', () => {
      render(completed);

      expect(shareButton()).toBeNull();
    });

    it('il tocco apre l\'anteprima tramite la modale, senza generare l\'immagine', () => {
      const stage = {...completed, shareable: true};
      render(stage);

      shareButton()!.click();

      expect(host.openSharePreview).toHaveBeenCalledOnceWith(stage);
    });

    it('un push rifiutato dalla modale non lascia promise rifiutate non gestite', async () => {
      host.openSharePreview.and.rejectWith(new Error('push fallito'));
      render({...completed, shareable: true});

      expect(() => shareButton()!.click()).not.toThrow();
      await fixture.whenStable();

      expect(host.openSharePreview).toHaveBeenCalledTimes(1);
    });
  });
});
