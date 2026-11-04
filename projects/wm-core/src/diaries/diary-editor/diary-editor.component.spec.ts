import {ComponentFixture, TestBed} from '@angular/core/testing';
import {CUSTOM_ELEMENTS_SCHEMA} from '@angular/core';
import {CommonModule} from '@angular/common';
import {AlertController} from '@ionic/angular';
import {LangService} from '@wm-core/localization/lang.service';
import {FakeTransPipe, fakeLangService} from '@wm-core/passport/testing/fake-trans';
import {WmDiaryEditorComponent} from './diary-editor.component';

/** Attende che Tiptap si carichi e che l'editor sia creato. */
async function settle(fixture: ComponentFixture<WmDiaryEditorComponent>): Promise<void> {
  for (let i = 0; i < 50 && !fixture.componentInstance.ready && !fixture.componentInstance.fallback; i++) {
    await new Promise(r => setTimeout(r, 20));
  }
  fixture.detectChanges();
}

describe('WmDiaryEditorComponent (oc:8169, ciclo 3)', () => {
  let fixture: ComponentFixture<WmDiaryEditorComponent>;
  let cmp: WmDiaryEditorComponent;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [CommonModule],
      declarations: [WmDiaryEditorComponent, FakeTransPipe],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        {provide: LangService, useValue: fakeLangService()},
        {provide: AlertController, useValue: jasmine.createSpyObj('AlertController', ['create'])},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(WmDiaryEditorComponent);
    cmp = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
    TestBed.resetTestingModule();
  });

  it('la barra ha i 12 bottoni nell\'ordine, senza sottolineato', async () => {
    fixture.detectChanges();
    await settle(fixture);

    const labels = Array.from(fixture.nativeElement.querySelectorAll('.wm-diary-editor-button')).map((b: any) =>
      b.getAttribute('aria-label'),
    );
    expect(labels).toEqual([
      'Grassetto', 'Corsivo', 'Barrato', 'Titolo', 'Sottotitolo', 'Elenco puntato', 'Elenco numerato',
      'Citazione', 'Collegamento', 'Linea di separazione', 'Annulla', 'Ripeti',
    ]);
  });

  it('solo gli stili hanno aria-pressed', async () => {
    fixture.detectChanges();
    await settle(fixture);

    const pressed = Array.from(fixture.nativeElement.querySelectorAll('.wm-diary-editor-button')).map((b: any) =>
      b.getAttribute('aria-pressed'),
    );
    expect(pressed.slice(0, 9)).toEqual(Array(9).fill('false'));
    expect(pressed.slice(9)).toEqual([null, null, null]);
  });

  it('mostra il racconto e non registra sottolineato né codice', async () => {
    cmp.value = '<p>Ciao</p>';
    fixture.detectChanges();
    await settle(fixture);

    expect(fixture.nativeElement.querySelector('.wm-diary-editor-area').textContent).toContain('Ciao');
    const names = cmp.editor!.extensionManager.extensions.map(e => e.name);
    expect(names).not.toContain('underline');
    expect(names).not.toContain('code');
    expect(names).not.toContain('codeBlock');
  });

  it('il contenuto incollato tiene solo la formattazione ammessa', async () => {
    fixture.detectChanges();
    await settle(fixture);
    const emitted: string[] = [];
    cmp.valueChange.subscribe(v => emitted.push(v));

    cmp.editor!.commands.insertContent(
      '<p style="color:red"><span style="font-family:Comic">x</span> <u>y</u> <code>z</code><img src="a.png"></p>',
    );

    expect(emitted[emitted.length - 1]).toBe('<p>x y z</p>');
  });

  it('emette HTML senza paragrafi vuoti finali e il numero di caratteri visibili', async () => {
    fixture.detectChanges();
    await settle(fixture);
    const values: string[] = [];
    const lengths: number[] = [];
    cmp.valueChange.subscribe(v => values.push(v));
    cmp.lengthChange.subscribe(n => lengths.push(n));

    cmp.editor!.commands.setContent('<ul><li><p>a &amp; b</p></li></ul><p></p>', {emitUpdate: true});

    expect(values[values.length - 1]).toBe('<ul><li><p>a &amp; b</p></li></ul>');
    expect(lengths[lengths.length - 1]).toBe(5);
  });

  it('editor vuoto vale testo vuoto', async () => {
    cmp.value = '<p>x</p>';
    fixture.detectChanges();
    await settle(fixture);
    const values: string[] = [];
    cmp.valueChange.subscribe(v => values.push(v));

    cmp.editor!.commands.setContent('<p></p>', {emitUpdate: true});

    expect(values[values.length - 1]).toBe('');
  });

  it('se Tiptap non si carica resta la casella di testo semplice', async () => {
    spyOn<any>(cmp, '_loadTiptap').and.rejectWith(new Error('ChunkLoadError'));
    cmp.value = '<h2>A</h2><p>B</p>';
    const values: string[] = [];
    cmp.valueChange.subscribe(v => values.push(v));
    fixture.detectChanges();
    await settle(fixture);

    const area = fixture.nativeElement.querySelector('textarea.wm-diary-editor-fallback') as HTMLTextAreaElement;
    expect(cmp.fallback).toBeTrue();
    expect(area.value).toBe('A\n\nB');
    expect(fixture.nativeElement.querySelector('.wm-diary-editor-toolbar')).toBeNull();

    area.value = 'Nuovo testo';
    area.dispatchEvent(new Event('input'));
    expect(values).toEqual(['Nuovo testo']);
  });
});
