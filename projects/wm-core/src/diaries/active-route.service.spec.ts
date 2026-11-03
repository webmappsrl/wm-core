import {Subject, of, throwError} from 'rxjs';
import {LineString} from 'geojson';
import {deviceActiveRoutes} from '@wm-core/utils/localForage';
import {ActiveRouteService, bboxContains, isNearLine} from './active-route.service';

/**
 * Pulsante del diario solo vicino al cammino (oc:8169, ciclo 2, opzione B corretta): in sottofondo
 * si salvano solo le posizioni del telefono; il confronto con le tappe si fa all'apertura del
 * dettaglio, quando le tappe del cammino sono note.
 */
describe('ActiveRouteService (oc:8169)', () => {
  const DAY = 24 * 60 * 60 * 1000;
  // linea est-ovest lungo il parallelo 43, da 11.00 a 11.10 di longitudine
  const line: LineString = {type: 'LineString', coordinates: [[11.0, 43.0], [11.1, 43.0]]};
  // 1 grado di latitudine ≈ 111 km: 0.0054° ≈ 600 m, 0.0135° ≈ 1.500 m
  const at600m: [number, number] = [11.05, 43.0054];
  const at1500m: [number, number] = [11.05, 43.0135];
  const feature = {type: 'Feature', geometry: line, properties: {}};
  let location$: Subject<any>;
  let ecSvc: {getEcTrack: jasmine.Spy};
  let svc: ActiveRouteService;

  const make = () =>
    new ActiveRouteService({onLocationChange$: location$} as any, ecSvc as any, 0);
  const loc = ([lon, lat]: [number, number]) => ({longitude: lon, latitude: lat});
  const writable = (s: ActiveRouteService, layerIds: (number | string)[]) => {
    let v = false;
    s.canWrite$(layerIds).subscribe(x => (v = x)).unsubscribe();
    return v;
  };

  beforeEach(async () => {
    await deviceActiveRoutes.clear();
    location$ = new Subject();
    ecSvc = {getEcTrack: jasmine.createSpy('getEcTrack').and.returnValue(of(feature))};
    svc = make();
  });

  afterEach(async () => {
    svc.ngOnDestroy();
    await deviceActiveRoutes.clear();
  });

  it('isNearLine: vero a 600 m dalla linea, falso a 1.500 m', () => {
    expect(isNearLine(at600m, line, 1000)).toBeTrue();
    expect(isNearLine(at1500m, line, 1000)).toBeFalse();
  });

  it('bboxContains con margine di 1 km: vero appena fuori dal rettangolo, falso a 5 km', () => {
    expect(bboxContains([11.0, 43.0, 11.1, 43.0], at600m, 1000)).toBeTrue();
    expect(bboxContains([11.0, 43.0, 11.1, 43.0], [11.05, 43.045], 1000)).toBeFalse();
  });

  it('in sottofondo salva solo le posizioni, senza scaricare tappe', async () => {
    await svc.start();
    await svc.recordPosition(loc(at600m));
    expect(ecSvc.getEcTrack).not.toHaveBeenCalled();
    expect((await svc.positions()).length).toBe(1);
  });

  it('una posizione a meno di 200 m dall\'ultima salvata non si aggiunge', async () => {
    await svc.start();
    await svc.recordPosition(loc(at600m));
    await svc.recordPosition(loc([11.0505, 43.0054]));
    expect((await svc.positions()).length).toBe(1);
  });

  it('all\'apertura del cammino: posizione a 600 m da una tappa → attivo', async () => {
    await svc.start();
    await svc.recordPosition(loc(at600m));
    await svc.evaluateLayer(1, [101], [11.0, 43.0, 11.1, 43.0]);
    expect(ecSvc.getEcTrack).toHaveBeenCalledWith(101);
    expect(writable(svc, [1])).toBeTrue();
    expect(writable(svc, [2])).toBeFalse();
  });

  it('all\'apertura del cammino: posizione a 1.500 m dalle tappe → non attivo', async () => {
    await svc.start();
    await svc.recordPosition(loc(at1500m));
    // rettangolo del cammino più largo della tappa: la posizione è dentro, ma lontana dalla linea
    await svc.evaluateLayer(1, [101], [11.0, 42.99, 11.1, 43.02]);
    expect(ecSvc.getEcTrack).toHaveBeenCalledWith(101);
    expect(writable(svc, [1])).toBeFalse();
  });

  it('senza rete e senza tappa in cache vale l\'esito del rettangolo', async () => {
    ecSvc.getEcTrack.and.returnValue(throwError(() => new Error('offline')));
    await svc.start();
    await svc.recordPosition(loc(at600m));
    await svc.evaluateLayer(1, [101], [11.0, 43.0, 11.1, 43.0]);
    expect(writable(svc, [1])).toBeTrue();
  });

  it('cammino controllato e non vicino: non riscarica le tappe senza posizioni nuove', async () => {
    await svc.start();
    await svc.recordPosition(loc(at1500m));
    await svc.evaluateLayer(1, [101], [11.0, 42.99, 11.1, 43.02]);
    await svc.evaluateLayer(1, [101], [11.0, 42.99, 11.1, 43.02]);
    expect(ecSvc.getEcTrack).toHaveBeenCalledTimes(1);
  });

  it('all\'apertura di una tappa la sua linea rende attivi i suoi cammini', async () => {
    await svc.start();
    await svc.recordPosition(loc(at600m));
    await svc.evaluateTrack(line, [1, 5]);
    expect(ecSvc.getEcTrack).not.toHaveBeenCalled();
    expect(writable(svc, [5])).toBeTrue();
    expect(writable(svc, [9, 5])).toBeTrue();
    expect(writable(svc, [9])).toBeFalse();
  });

  it('lastSeen di 91 giorni fa non è attivo, di 89 sì; le posizioni vecchie si cancellano', async () => {
    await deviceActiveRoutes.setItem('1', Date.now() - 91 * DAY);
    await deviceActiveRoutes.setItem('2', Date.now() - 89 * DAY);
    await deviceActiveRoutes.setItem('__positions', [
      {lon: 11.05, lat: 43.0054, t: Date.now() - 91 * DAY},
      {lon: 12.0, lat: 44.0, t: Date.now() - 1 * DAY},
    ]);
    await svc.start();
    expect(writable(svc, [1])).toBeFalse();
    expect(writable(svc, [2])).toBeTrue();
    expect((await svc.positions()).length).toBe(1);
  });

  it('una posizione salvata dopo l\'apertura del dettaglio fa ripartire il confronto', async () => {
    await svc.start();
    const seen: (number | null)[] = [];
    const sub = svc.lastPositionAt$.subscribe(t => seen.push(t));
    // dettaglio aperto prima di avere posizioni: nessun esito
    await svc.evaluateLayer(1, [101], [11.0, 43.0, 11.1, 43.0]);
    expect(writable(svc, [1])).toBeFalse();
    await svc.recordPosition(loc(at600m));
    expect(seen[seen.length - 1]).not.toBeNull();
    // chi ascolta lastPositionAt$ rilancia il confronto, che ora trova la posizione
    await svc.evaluateLayer(1, [101], [11.0, 43.0, 11.1, 43.0]);
    expect(writable(svc, [1])).toBeTrue();
    sub.unsubscribe();
  });

  it('nella finestra di attesa si salva anche l\'ultima posizione, non solo la prima', async () => {
    svc.ngOnDestroy();
    svc = new ActiveRouteService({onLocationChange$: location$} as any, ecSvc as any, 40);
    await svc.start();
    location$.next(loc([12.0, 44.0]));
    location$.next(loc(at600m));
    await new Promise(r => setTimeout(r, 80));
    const saved = await svc.positions();
    expect(saved.length).toBe(2);
    expect(saved[1].lat).toBeCloseTo(at600m[1], 4);
  });

  it('la posizione dal GPS viene salvata dallo stream', async () => {
    await svc.start();
    location$.next(loc(at600m));
    await new Promise(r => setTimeout(r, 20));
    expect((await svc.positions()).length).toBe(1);
  });
});
