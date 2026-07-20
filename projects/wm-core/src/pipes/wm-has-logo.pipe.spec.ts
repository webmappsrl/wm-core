import {WmHasLogoPipe} from './wm-has-logo.pipe';

describe('WmHasLogoPipe', () => {
  let pipe: WmHasLogoPipe;

  beforeEach(() => {
    pipe = new WmHasLogoPipe();
  });

  it('returns false for undefined', () => {
    expect(pipe.transform(undefined)).toBe(false);
  });

  it('returns false for null', () => {
    expect(pipe.transform(null)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(pipe.transform('')).toBe(false);
  });

  it('returns false for whitespace-only string', () => {
    expect(pipe.transform('   ')).toBe(false);
  });

  it('returns true for a populated URL string', () => {
    expect(pipe.transform('https://example.com/logo.webp')).toBe(true);
  });
});
