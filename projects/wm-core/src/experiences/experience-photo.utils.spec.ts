import {resizeImageBlob} from './experience-photo.utils';

describe('resizeImageBlob (oc:8169)', () => {
  /**
   * Crea un PNG delle dimensioni date.
   *
   * @param width Larghezza.
   * @param height Altezza.
   * @returns Il blob PNG.
   */
  async function png(width: number, height: number): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')!.fillRect(0, 0, width, height);
    return new Promise<Blob>(resolve => canvas.toBlob(b => resolve(b!), 'image/png'));
  }

  it('riduce il lato lungo a 1600 px e ricodifica in JPEG', async () => {
    const out = await resizeImageBlob(await png(3200, 1000));
    expect(out.type).toBe('image/jpeg');
    const bmp = await createImageBitmap(out);
    expect(bmp.width).toBe(1600);
    expect(bmp.height).toBe(500);
  });

  it('non ingrandisce un\'immagine piccola', async () => {
    const out = await resizeImageBlob(await png(800, 600));
    const bmp = await createImageBitmap(out);
    expect(bmp.width).toBe(800);
    expect(bmp.height).toBe(600);
  });

  it('un blob che non è un\'immagine torna invariato', async () => {
    const blob = new Blob(['non è un\'immagine'], {type: 'text/plain'});
    expect(await resizeImageBlob(blob)).toBe(blob);
  });
});
