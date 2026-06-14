import { sandboxAccounts } from './aa.module';

describe('AA sandbox accounts', () => {
  it('returns a deterministic, well-formed set spanning liquid and investment classes', () => {
    const a = sandboxAccounts();
    const b = sandboxAccounts();
    expect(a).toEqual(b); // deterministic

    expect(a.length).toBeGreaterThanOrEqual(3);
    for (const acc of a) {
      expect(acc.accountRef).toMatch(/^aa-/);
      expect(acc.balanceMinor).toBeGreaterThan(0);
      expect(acc.currency).toBe('INR');
    }
    const classes = new Set(a.map((x) => x.assetClass));
    expect(classes.has('cash')).toBe(true);
    expect(classes.has('equity')).toBe(true);

    // Account refs must be unique so the upsert key never collides.
    const refs = a.map((x) => x.accountRef);
    expect(new Set(refs).size).toBe(refs.length);
  });
});
