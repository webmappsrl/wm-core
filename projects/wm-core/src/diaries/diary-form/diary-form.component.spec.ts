import {HttpErrorResponse} from '@angular/common/http';
import {of, throwError} from 'rxjs';
import {Diary} from '../diary.model';
import {WmDiaryFormComponent} from './diary-form.component';

describe('WmDiaryFormComponent (oc:8169)', () => {
  let svc: {create: jasmine.Spy; update: jasmine.Spy; currentUserId$: () => any};
  let drafts: any;
  let saved: any;
  let outbox: any;
  let host: {back: jasmine.Spy; registerGuard: jasmine.Spy};
  let alertCtrl: {create: jasmine.Spy};
  let alertRole: 'confirm' | 'cancel';

  const photo = (n: number) => ({webPath: `blob:${n}`}) as any;
  const diary: Diary = {
    id: 9,
    uuid: 'uuid-9',
    layer: {id: 1, name: 'L'},
    ecTrack: null,
    description: 'testo',
    createdAt: '',
    updatedAt: '',
    photos: [
      {id: 10, url: 'u10', thumbnail: 't10'},
      {id: 11, url: 'u11', thumbnail: 't11'},
    ],
    ugcTrackIds: [],
    publicationConsent: false,
  };

  function create(): WmDiaryFormComponent {
    const cmp = new WmDiaryFormComponent(
      svc as any,
      alertCtrl as any,
      {instant: (k: string) => k} as any,
      {markForCheck() {}} as any,
      drafts as any,
      outbox as any,
      {create: async () => ({present: async () => {}})} as any,
    );
    cmp.layerId = 1;
    cmp.host = host;
    spyOn(cmp as any, '_toBlob').and.resolveTo(new Blob());
    cmp.ngOnInit();
    return cmp;
  }

  beforeEach(() => {
    svc = {
      create: jasmine.createSpy('create').and.returnValue(of({})),
      update: jasmine.createSpy('update').and.returnValue(of({})),
      currentUserId$: () => of(5),
    };
    saved = null;
    outbox = {active: false, enqueue: jasmine.createSpy('enqueue').and.resolveTo()};
    drafts = {
      load: jasmine.createSpy('load').and.callFake(async () => saved),
      save: jasmine.createSpy('save').and.callFake(async (d: any) => (saved = d)),
      remove: jasmine.createSpy('remove').and.callFake(async () => (saved = null)),
    };
    host = {back: jasmine.createSpy('back'), registerGuard: jasmine.createSpy('registerGuard')};
    alertRole = 'confirm';
    alertCtrl = {
      create: jasmine.createSpy('create').and.callFake(async () => ({
        present: async () => {},
        onDidDismiss: async () => ({role: alertRole}),
      })),
    };
  });

  it('la spunta del consenso parte non selezionata e si invia', async () => {
    const cmp = create();
    expect(cmp.publicationConsent).toBeFalse();
    cmp.onDescription('ciao');
    cmp.onPublicationConsent(true);
    await cmp.submit();
    expect(svc.create.calls.argsFor(0)[0].publicationConsent).toBeTrue();
  });

  it('in modifica ripropone il consenso salvato', () => {
    const cmp = create();
    cmp.diary = {...diary, publicationConsent: true};
    expect(cmp.publicationConsent).toBeTrue();
  });

  it('riaprendo il form nello stesso contesto ripropone testo, consenso e uuid della bozza', async () => {
    saved = {key: 'u5:l1:t0', userId: 5, uuid: 'uuid-bozza', layerId: 1, description: 'scritto ieri', photos: [], publicationConsent: true, updatedAt: Date.now()};
    const cmp = create();
    await cmp.draftReady;
    expect(drafts.load).toHaveBeenCalledWith('u5:l1:t0');
    expect(cmp.description).toBe('scritto ieri');
    expect(cmp.publicationConsent).toBeTrue();
    cmp.onDescription('scritto ieri e oggi');
    await cmp.submit();
    expect(svc.create.calls.argsFor(0)[0].uuid).toBe('uuid-bozza');
  });

  it('salva la bozza quando cambia la spunta e la cancella dopo la pubblicazione', async () => {
    const cmp = create();
    await cmp.draftReady;
    cmp.onDescription('ciao');
    cmp.onPublicationConsent(true);
    await cmp.flushDraft();
    expect(drafts.save).toHaveBeenCalled();
    expect(drafts.save.calls.mostRecent().args[0].description).toBe('ciao');
    await cmp.submit();
    expect(drafts.remove).toHaveBeenCalledWith('u5:l1:t0');
  });

  it('uscendo senza pubblicare (conferma) la bozza si cancella', async () => {
    const cmp = create();
    await cmp.draftReady;
    cmp.onDescription('ciao');
    alertRole = 'confirm';
    expect(await cmp.canLeave()).toBeTrue();
    expect(drafts.remove).toHaveBeenCalledWith('u5:l1:t0');
  });

  it('offline, «Pubblica» su un diario nuovo lo mette in coda, cancella la bozza e chiude', async () => {
    outbox.active = true;
    const cmp = create();
    await cmp.draftReady;
    cmp.onDescription('in rifugio');
    svc.create.and.returnValue(throwError(() => new HttpErrorResponse({status: 0})));
    await cmp.submit();
    expect(outbox.enqueue).toHaveBeenCalledTimes(1);
    expect(outbox.enqueue.calls.argsFor(0)[1]).toBe(5);
    expect(drafts.remove).toHaveBeenCalledWith('u5:l1:t0');
    expect(host.back).toHaveBeenCalledTimes(1);
  });

  it('offline, la modifica non va in coda: resta l\'errore di rete', async () => {
    outbox.active = true;
    const cmp = create();
    cmp.diary = diary;
    await cmp.draftReady;
    cmp.onDescription('modifica');
    svc.update.and.returnValue(throwError(() => new HttpErrorResponse({status: 0})));
    await cmp.submit();
    expect(outbox.enqueue).not.toHaveBeenCalled();
    expect(cmp.networkError).toBeTrue();
  });

  it('senza coda attiva (webapp) offline resta l\'errore di rete', async () => {
    outbox.active = false;
    const cmp = create();
    await cmp.draftReady;
    cmp.onDescription('ciao');
    svc.create.and.returnValue(throwError(() => new HttpErrorResponse({status: 0})));
    await cmp.submit();
    expect(outbox.enqueue).not.toHaveBeenCalled();
    expect(cmp.networkError).toBeTrue();
  });

  it('salvando solo il testo non riconverte le foto', async () => {
    const cmp = create();
    await cmp.draftReady;
    cmp.onPhotos([photo(1)]);
    await cmp.flushDraft();
    const conversions = (cmp as any)._toBlob.calls.count();
    cmp.onDescription('altro testo');
    await cmp.flushDraft();
    expect((cmp as any)._toBlob.calls.count()).toBe(conversions);
  });

  it('pubblica disabilitato con solo spazi', () => {
    const cmp = create();
    cmp.onDescription('   ');
    expect(cmp.canSubmit).toBeFalse();
    cmp.onPhotos([photo(1)]);
    expect(cmp.canSubmit).toBeTrue();
  });

  it('stesso uuid su due invii', async () => {
    const cmp = create();
    cmp.onDescription('ciao');
    svc.create.and.returnValues(throwError(() => new HttpErrorResponse({status: 0})), of({}));
    await cmp.submit();
    await cmp.submit();
    expect(svc.create).toHaveBeenCalledTimes(2);
    expect(svc.create.calls.argsFor(0)[0].uuid).toBe(svc.create.calls.argsFor(1)[0].uuid);
    expect(host.back).toHaveBeenCalledTimes(1);
  });

  it('errore di rete mantiene testo', async () => {
    const cmp = create();
    cmp.onDescription('ciao');
    cmp.onPhotos([photo(1)]);
    svc.create.and.returnValue(throwError(() => new HttpErrorResponse({status: 0})));
    await cmp.submit();
    expect(cmp.errorMessage).toBe(
      'Nessuna connessione. Il tuo racconto e le foto restano qui: riprova quando sei online.',
    );
    expect(cmp.networkError).toBeTrue();
    expect(cmp.description).toBe('ciao');
    expect(cmp.newPhotos.length).toBe(1);
    expect(host.back).not.toHaveBeenCalled();
  });

  it('un errore diverso mostra il messaggio generico', async () => {
    const cmp = create();
    cmp.onDescription('ciao');
    svc.create.and.returnValue(throwError(() => new HttpErrorResponse({status: 500})));
    await cmp.submit();
    expect(cmp.errorMessage).toBe('Invio non riuscito, riprova');
    expect(cmp.networkError).toBeFalse();
  });

  it('un 422 sulle foto mostra il messaggio sulle foto non valide', async () => {
    const cmp = create();
    cmp.onDescription('ciao');
    svc.create.and.returnValue(
      throwError(() => new HttpErrorResponse({status: 422, error: {errors: {'images.0': ['x']}}})),
    );
    await cmp.submit();
    expect(cmp.errorMessage).toBe('Una o più foto non sono valide: usa JPEG, PNG o WebP fino a 5 MB.');
    expect(cmp.networkError).toBeFalse();
  });

  it('un 422 sulla tappa non parla di foto', async () => {
    const cmp = create();
    cmp.onDescription('ciao');
    svc.create.and.returnValue(
      throwError(() => new HttpErrorResponse({status: 422, error: {errors: {ec_track_id: ['x']}}})),
    );
    await cmp.submit();
    expect(cmp.errorMessage).toBe('La tappa non appartiene a questo cammino.');
  });

  it('un 422 sul testo chiede un testo o una foto', async () => {
    const cmp = create();
    cmp.onDescription('ciao');
    svc.create.and.returnValue(
      throwError(() => new HttpErrorResponse({status: 422, error: {errors: {description: ['x']}}})),
    );
    await cmp.submit();
    expect(cmp.errorMessage).toBe('Scrivi un testo o aggiungi almeno una foto.');
  });

  it('un 422 senza campi riconosciuti mostra l\'errore generico', async () => {
    const cmp = create();
    cmp.onDescription('ciao');
    svc.create.and.returnValue(throwError(() => new HttpErrorResponse({status: 422})));
    await cmp.submit();
    expect(cmp.errorMessage).toBe('Invio non riuscito, riprova');
  });

  it('in modifica senza cambi, durante «Salva» canLeave nega l\'uscita', async () => {
    const cmp = create();
    cmp.diary = diary;
    cmp.submitting = true;
    expect(await cmp.canLeave()).toBeFalse();
    expect(alertCtrl.create).not.toHaveBeenCalled();
  });

  it('il segnaposto è della tappa solo con ecTrackId', () => {
    const cmp = create();
    expect(cmp.placeholder).toBe("Com'è andata? Cosa ti porti a casa da questo cammino?");
    cmp.ecTrackId = 70;
    expect(cmp.placeholder).toBe("Com'è andata? Cosa ti porti a casa da questa tappa?");
  });

  it('sul web _toBlob riduce la foto in JPEG, su nativo la lascia com\'è', async () => {
    const cmp = create();
    (cmp as any)._toBlob.and.callThrough();
    const canvas = document.createElement('canvas');
    canvas.width = 2000;
    canvas.height = 1000;
    canvas.getContext('2d')!.fillRect(0, 0, 2000, 1000);
    const png = await new Promise<Blob>(resolve => canvas.toBlob(b => resolve(b!), 'image/png'));
    const url = URL.createObjectURL(png);
    try {
      const isNative = spyOn(cmp as any, '_isNative').and.returnValue(false);
      const web: Blob = await (cmp as any)._toBlob({webPath: url});
      expect(web.type).toBe('image/jpeg');
      expect((await createImageBitmap(web)).width).toBe(1600);
      isNative.and.returnValue(true);
      const native: Blob = await (cmp as any)._toBlob({webPath: url});
      expect(native.type).toBe('image/png');
    } finally {
      URL.revokeObjectURL(url);
    }
  });

  it('canLeave chiede conferma con testo presente', async () => {
    const cmp = create();
    expect(await cmp.canLeave()).toBeTrue();
    expect(alertCtrl.create).not.toHaveBeenCalled();

    cmp.onDescription('bozza');
    expect(await cmp.canLeave()).toBeTrue();
    expect(alertCtrl.create).toHaveBeenCalledTimes(1);

    alertRole = 'cancel';
    expect(await cmp.canLeave()).toBeFalse();
  });

  it('in modifica invia keepMediaIds senza la foto tolta', async () => {
    const cmp = create();
    cmp.diary = diary;
    cmp.onSyncedPhotoRemoved(10);
    await cmp.submit();
    expect(svc.update).toHaveBeenCalledTimes(1);
    const [id, draft] = svc.update.calls.argsFor(0);
    expect(id).toBe(9);
    expect(draft.keepMediaIds).toEqual([11]);
    expect(draft.uuid).toBe('uuid-9');
  });

  it('in modifica senza cambi si esce senza conferma', async () => {
    const cmp = create();
    cmp.diary = diary;
    expect(await cmp.canLeave()).toBeTrue();
    expect(alertCtrl.create).not.toHaveBeenCalled();
  });

  it('la lista combinata del picker conta solo le foto nuove', async () => {
    const cmp = create();
    cmp.diary = diary;
    const combined = [
      {webPath: 'blob:new'},
      {id: 10, webPath: 't10'},
      {id: 11, webPath: 't11'},
    ] as any[];
    cmp.onPhotos(combined);
    expect(cmp.newPhotos.length).toBe(1);
    expect(cmp.photosCount).toBe(3);
    cmp.onPhotos(combined.slice(1));
    expect(cmp.isDirty).toBeFalse();
    cmp.onPhotos(combined);
    await cmp.submit();
    expect((cmp as any)._toBlob).toHaveBeenCalledTimes(1);
    expect(svc.update.calls.argsFor(0)[1].newPhotos.length).toBe(1);
  });

  it('close esce solo se canLeave conferma', async () => {
    const cmp = create();
    cmp.onDescription('bozza');
    alertRole = 'cancel';
    await cmp.close();
    expect(host.back).not.toHaveBeenCalled();
    alertRole = 'confirm';
    await cmp.close();
    expect(host.back).toHaveBeenCalledTimes(1);
  });
});
