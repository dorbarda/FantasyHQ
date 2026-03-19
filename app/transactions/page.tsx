import { hasEspnCredentials, getTransactions } from '@/lib/espn';
import type { TransactionsData } from '@/lib/types';
import TransactionsCharts from '@/components/TransactionsCharts';

export const revalidate = 3600; // refresh hourly

export default async function TransactionsPage() {
  if (!hasEspnCredentials()) {
    return (
      <div className="py-5">
        <h1 className="text-[28px] font-bold tracking-tight text-[#0f1419] mb-2">Transactions</h1>
        <p className="text-[15px] text-[#536471]">ESPN credentials required.</p>
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
    <div className="py-5">
      <div className="mb-6">
        <h1 className="text-[28px] font-bold tracking-tight text-[#0f1419]">Transactions</h1>
        <p className="text-[15px] text-[#536471] font-medium">
          Season pickup activity · most targeted players · busiest managers
        </p>
      </div>

      {error && (
        <p className="text-[15px] text-[#536471]">Could not load transaction data — try again later.</p>
      )}

      {data && data.totalAdds === 0 && (
        <div className="border border-[#eff3f4] rounded-2xl px-6 py-10 text-center">
          <p className="text-[15px] font-bold text-[#0f1419]">No transactions yet this season</p>
        </div>
      )}

      {data && data.totalAdds > 0 && <TransactionsCharts data={data} />}
    </div>
  );
}
