import {WmUserInitialsPipe} from './wm-user-initials.pipe';

describe('WmUserInitialsPipe', () => {
  let pipe: WmUserInitialsPipe;

  beforeEach(() => {
    pipe = new WmUserInitialsPipe();
  });

  it('returns the uppercase first letter of the name', () => {
    expect(pipe.transform('mario')).toBe('M');
  });

  it('returns only the first letter even if the name contains a space (full name in a single field)', () => {
    expect(pipe.transform('Gianlorenzo Spaggiari')).toBe('G');
  });

  it('trims leading whitespace before taking the first letter', () => {
    expect(pipe.transform('  Paolo')).toBe('P');
  });

  it('returns an empty string for null, undefined or empty name', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
    expect(pipe.transform('   ')).toBe('');
  });
});
