import { FinancialSnapshotService } from './financial-snapshot.service';

/** Minimal Prisma stub returning fixed rows for the four entities assemble() reads. */
function fakePrisma(opts: {
  profile?: any;
  accounts?: any[];
  debts?: any[];
  goals?: any[];
}) {
  return {
    profile: { findUnique: async () => opts.profile ?? null },
    account: { findMany: async () => opts.accounts ?? [] },
    debt: { findMany: async () => opts.debts ?? [] },
    goal: { findMany: async () => opts.goals ?? [] },
  } as any;
}

const yearsAgo = (n: number) => new Date(Date.now() - n * 365.25 * 24 * 60 * 60 * 1000);

describe('FinancialSnapshotService', () => {
  it('derives age from dateOfBirth instead of a hardcoded value', async () => {
    const svc = new FinancialSnapshotService(
      fakePrisma({ profile: { baseCurrency: 'INR', dateOfBirth: yearsAgo(58), dependents: 0 } }),
    );
    const snap = await svc.assemble('u1');
    expect(snap.age).toBeGreaterThanOrEqual(57);
    expect(snap.age).toBeLessThanOrEqual(59);
    expect(snap.age).not.toBe(35);
  });

  it('carries real protection data (term cover + health) into the score input', async () => {
    const svc = new FinancialSnapshotService(
      fakePrisma({
        profile: {
          baseCurrency: 'INR',
          dateOfBirth: yearsAgo(40),
          dependents: 2,
          hasTermCover: true,
          hasHealthInsurance: true,
          termLifeCoverMinor: BigInt(50_000_00), // ₹50,00,000
          monthlyExpensesMinor: BigInt(1_00_000_00),
          annualIncomeMinor: BigInt(24_00_000_00),
        },
        accounts: [
          { balanceMinor: BigInt(10_00_000_00), assetClass: 'equity', type: 'investment', isLiability: false },
          { balanceMinor: BigInt(5_00_000_00), assetClass: 'cash', type: 'bank', isLiability: false },
        ],
      }),
    );
    const snap = await svc.assemble('u1');
    expect(snap.existingLifeCoverMinor).toBe(50_000_00);
    expect(snap.hasHealthInsurance).toBe(true);

    const scoreInput = FinancialSnapshotService.toScoreInput(snap);
    expect(scoreInput.existingLifeCoverMinor).toBe(50_000_00);
    expect(scoreInput.hasHealthInsurance).toBe(true);
    expect(scoreInput.age).toBe(snap.age);
    // Retirement gap is derived (not the old hardcoded 0) for an under-funded saver.
    expect(scoreInput.retirementRequiredCorpusMinor).toBeGreaterThan(0);
    expect(scoreInput.retirementCorpusGapMinor).toBeGreaterThan(0);
  });

  it('falls back to age 35 only when dateOfBirth is missing', async () => {
    const svc = new FinancialSnapshotService(
      fakePrisma({ profile: { baseCurrency: 'INR', dateOfBirth: null } }),
    );
    const snap = await svc.assemble('u1');
    expect(snap.age).toBe(35);
  });
});
