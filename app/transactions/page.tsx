import { hasEspnCredentials, getTransactions } from '@/lib/espn';
import type { TransactionsData } from '@/lib/types';
import TransactionsCharts from '@/components/TransactionsCharts';

export const revalidate = 3600; // refresh hourly

export default async function TransactionsPage() {
  if (!hasEspnCredentials()) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-[28px] sm:text-[32px] font-black tracking-tight text-[#0F172A] mb-2">Transactions</h1>
        <p className="text-[14px] text-[#475569] mt-1">ESPN credentials required.</p>
      </div>
    );
  }

  let data: TransactionsData | null = null;
  let error = false;

  try {
    data = await getTransactions();
  } catch (err) {
    console.error('Transactions fetch failed:', err);
    error = true;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-[28px] sm:text-[32px] font-black tracking-tight text-[#0F172A]">Transactions</h1>
        <p className="text-[14px] text-[#475569] mt-1">
          Season pickup activity · most targeted players · busiest managers
        </p>
      </div>

      {error && (
        <p className="text-[14px] text-[#475569]">Could not load transaction data — try again later.</p>
      )}

      {data && data.totalAdds === 0 && (
        <div className="border border-[#E2E8F0] rounded-lg px-6 py-10 text-center">
          <p className="text-[15px] font-bold text-[#0F172A]">No transactions yet this season</p>
        </div>
      )}

      {data && data.totalAdds > 0 && <TransactionsCharts data={data} />}
    </div>
  );
}
