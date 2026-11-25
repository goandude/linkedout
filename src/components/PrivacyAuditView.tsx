import { useMemo } from 'react';
import { CreditCard, ShieldCheck, Target } from 'lucide-react';
import type { LinkedInDataset } from '../types/linkedin';
import { ResponsiveDataTable } from './ResponsiveDataTable';

export function PrivacyAuditView({ dataset }: { dataset: LinkedInDataset }) {
  const adTargeting = dataset.tables.ad_targeting ?? [];
  const receipts = dataset.tables.receipts ?? [];
  const registration = dataset.tables.registration ?? [];
  const emails = dataset.tables.email_addresses ?? [];
  const phones = dataset.tables.phone_numbers ?? [];
  const verifications = dataset.tables.verifications ?? [];

  const adFields = useMemo(() => {
    if (adTargeting.length === 0) return [];
    const row = adTargeting[0];
    return Object.entries(row)
      .filter(([, val]) => val && val.trim().length > 0)
      .map(([key, val]) => ({
        key,
        items: val
          .split(';')
          .map((s) => s.trim())
          .filter(Boolean),
      }));
  }, [adTargeting]);

  const totalSpend = useMemo(() => {
    const byCurrency = new Map<string, number>();
    receipts.forEach((r) => {
      const curr = r['Currency Code'] || 'USD';
      const amt = parseFloat(r['Total Amount'] || '0');
      if (!Number.isNaN(amt)) {
        byCurrency.set(curr, (byCurrency.get(curr) ?? 0) + amt);
      }
    });
    return Array.from(byCurrency.entries());
  }, [receipts]);

  return (
    <div className="space-y-6">
      {/* Ad Targeting Profile */}
      <div className="glass-card rounded-2xl p-5">
        <div className="mb-4 flex items-center gap-2">
          <Target className="h-4 w-4 text-rose-600" />
          <h2 className="text-sm font-semibold text-slate-900">Ad Targeting Profile (What LinkedIn Infers About You)</h2>
        </div>

        {adFields.length === 0 ? (
          <p className="text-xs text-slate-500">No Ad_Targeting.csv data found in this archive.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {adFields.map(({ key, items }) => (
              <div key={key} className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{key}</p>
                <div className="flex flex-wrap gap-1.5">
                  {items.slice(0, 24).map((item, idx) => (
                    <span
                      key={idx}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700 shadow-2xs"
                    >
                      {item}
                    </span>
                  ))}
                  {items.length > 24 && (
                    <span className="text-[11px] text-slate-500">+{items.length - 24} more</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Receipts & Spend */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-slate-900">Receipts & Lifetime Spend</h2>
          </div>
          <div className="flex gap-2">
            {totalSpend.map(([curr, amt]) => (
              <span
                key={curr}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
              >
                {curr} {amt.toFixed(2)}
              </span>
            ))}
          </div>
        </div>
        <ResponsiveDataTable rows={receipts} exportName="linkedout_receipts" />
      </div>

      {/* Account & Verifications */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-cyan-600" />
          <h2 className="text-sm font-semibold text-slate-900">Account, Contact & Verification Footprint</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-semibold text-slate-700">Registration & Emails</h3>
            <ResponsiveDataTable rows={[...registration, ...emails]} exportName="linkedout_account_emails" />
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold text-slate-700">Phones & Verifications</h3>
            <ResponsiveDataTable rows={[...phones, ...verifications]} exportName="linkedout_verifications" />
          </div>
        </div>
      </div>
    </div>
  );
}
