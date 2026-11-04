import {
  DIARY_MAX_VISIBLE,
  diaryPlainText,
  diaryTextExcerpt,
  diaryVisibleLength,
  normalizeDiaryLink,
  trimDiaryHtml,
} from './diary-text.utils';

describe('testo del diario (oc:8169, ciclo 3)', () => {
  it('il limite del testo visibile è 20.000 caratteri', () => {
    expect(DIARY_MAX_VISIBLE).toBe(20000);
  });

  it('toglie i paragrafi vuoti in fondo che l\'editor aggiunge', () => {
    expect(trimDiaryHtml('<p>Ciao</p><p></p><p><br></p>')).toBe('<p>Ciao</p>');
    expect(trimDiaryHtml('<p></p>')).toBe('');
  });

  it('l\'estratto non ha tag, separa i blocchi e decodifica le entità', () => {
    expect(
      diaryTextExcerpt('<h2>Giorno 1</h2><p>Partiti <strong>presto</strong> &amp; bene.</p><ul><li><p>acqua</p></li></ul>'),
    ).toBe('Giorno 1 Partiti presto & bene. acqua');
    expect(diaryTextExcerpt(null)).toBe('');
  });

  it('conta i caratteri visibili, senza tag e con le entità decodificate', () => {
    expect(diaryVisibleLength('<p>a &amp; b</p>')).toBe(5);
    expect(diaryVisibleLength('<p></p>')).toBe(0);
    expect(diaryVisibleLength(undefined)).toBe(0);
    expect(diaryVisibleLength('<p>&nbsp;</p><hr>')).toBe(0);
  });

  it('il testo semplice separa i blocchi con una riga vuota', () => {
    expect(diaryPlainText('<h2>A</h2><p>B<br>C</p>')).toBe('A\n\nB\nC');
    expect(diaryPlainText('')).toBe('');
  });

  it('normalizza i collegamenti: https se manca lo schema, solo schemi ammessi', () => {
    expect(normalizeDiaryLink('www.camminiditalia.it')).toBe('https://www.camminiditalia.it');
    expect(normalizeDiaryLink(' camminiditalia.it/x ')).toBe('https://camminiditalia.it/x');
    expect(normalizeDiaryLink('http://a.it')).toBe('http://a.it');
    expect(normalizeDiaryLink('mailto:x@y.it')).toBe('mailto:x@y.it');
    expect(normalizeDiaryLink('javascript:alert(1)')).toBeNull();
    expect(normalizeDiaryLink('ftp://a.it')).toBeNull();
    expect(normalizeDiaryLink('   ')).toBeNull();
  });
});
