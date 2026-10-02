import {SimpleChange} from '@angular/core';
import {firstValueFrom, of} from 'rxjs';
import {map} from 'rxjs/operators';
import {WmPassportProgressBadgeComponent} from './passport-progress-badge.component';
import {WmPassportModalComponent} from '../passport-modal/passport-modal.component';

describe('WmPassportProgressBadgeComponent (oc:8166)', () => {
  let getProgress: jasmine.Spy;
  let modalCtrl: jasmine.SpyObj<any>;
  let present: jasmine.Spy;
  let refreshProgress: jasmine.Spy;
  let dismissed: () => void;

  function create(logged: boolean, progress: any, layerId: string | number = '4') {
    const store = {select: () => of(logged)} as any;
    getProgress = jasmine.createSpy('getProgress').and.returnValue(of(progress));
    present = jasmine.createSpy('present').and.resolveTo();
    refreshProgress = jasmine.createSpy('refreshProgress');
    const onDidDismiss = () => new Promise<void>(r => (dismissed = r));
    modalCtrl = jasmine.createSpyObj('ModalController', ['create']);
    modalCtrl.create.and.resolveTo({present, onDidDismiss});
    // come il vero PassportService.visibleProgress: null se non loggato, senza id o senza tappe
    const visibleProgress = (id: number | null) =>
      id == null ? of(null) : getProgress(id).pipe(map((p: any) => (logged && p?.totalStages > 0 ? p : null)));
    const cmp = new WmPassportProgressBadgeComponent({visibleProgress, refreshProgress} as any, modalCtrl);
    cmp.layerId = layerId;
    cmp.ngOnChanges({layerId: new SimpleChange(undefined, layerId, true)});
    return cmp;
  }

  it('utente loggato con track: mostra percentuale e tappe', async () => {
    const vm = await firstValueFrom(
      create(true, {totalStages: 30, completedStages: 19, percent: 63}).vm$,
    );

    expect(vm).toEqual({percent: 63, completed: 19, total: 30});
  });

  it("converte l'id del layer (stringa in ILAYER) in numero", async () => {
    await firstValueFrom(create(true, {totalStages: 30, completedStages: 19, percent: 63}, '4').vm$);

    expect(getProgress).toHaveBeenCalledWith(4);
  });

  it('utente non loggato: nessun badge', async () => {
    const vm = await firstValueFrom(
      create(false, {totalStages: 30, completedStages: 0, percent: 0}).vm$,
    );

    expect(vm).toBeNull();
  });

  it('layer senza track: nessun badge, mai «0/0»', async () => {
    const vm = await firstValueFrom(
      create(true, {totalStages: 0, completedStages: 0, percent: 0}).vm$,
    );

    expect(vm).toBeNull();
  });

  it('layer senza id: nessun badge', async () => {
    const vm = await firstValueFrom(
      create(true, {totalStages: 30, completedStages: 0, percent: 0}, null).vm$,
    );

    expect(vm).toBeNull();
  });

  it('il tap apre la modale del passaporto con layer e titolo', async () => {
    const cmp = create(true, {totalStages: 30, completedStages: 19, percent: 63}, '4');
    cmp.layerTitle = 'Cammino Grande di Celestino';
    cmp.layerLogo = 'logo.png';
    cmp.layerImage = 'foto.jpg';

    await cmp.openDetail();

    expect(modalCtrl.create).toHaveBeenCalledWith({
      component: WmPassportModalComponent,
      componentProps: {
        layerId: 4,
        layerTitle: 'Cammino Grande di Celestino',
        layerLogo: 'logo.png',
        layerImage: 'foto.jpg',
      },
      backdropDismiss: false,
    });
    expect(present).toHaveBeenCalled();
  });

  it('alla chiusura della modale rilegge il progresso del layer (oc:8676)', async () => {
    const cmp = create(true, {totalStages: 13, completedStages: 6, percent: 46}, '40');

    await cmp.openDetail();
    expect(refreshProgress).not.toHaveBeenCalled();
    dismissed();
    await Promise.resolve();
    await Promise.resolve();

    expect(refreshProgress).toHaveBeenCalledWith(40);
  });

  it('se cambia solo il titolo (es. cambio lingua) non ricrea lo stream: niente sfarfallio', () => {
    const cmp = create(true, {totalStages: 30, completedStages: 19, percent: 63});
    const before = cmp.vm$;

    cmp.ngOnChanges({layerTitle: new SimpleChange('Cammino', 'Trail', false)});

    expect(cmp.vm$).toBe(before);
  });
});
