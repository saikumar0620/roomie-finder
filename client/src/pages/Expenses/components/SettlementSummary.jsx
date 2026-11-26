
import React, { useMemo } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { calculateNetBalances, optimizeSettlements } from '../../../utils/expenseMath';
import toast from 'react-hot-toast';

export default function SettlementSummary({ expenses, shares, members }) {
  const { user } = useAuthStore();

  const transactions = useMemo(() => {
    if (!expenses || !shares || !members) return [];

    const profilesMap = members.reduce((acc, m) => {
      acc[m.$id] = m;
      return acc;
    }, {});

    const balances = calculateNetBalances(expenses, shares);
    return optimizeSettlements(balances, profilesMap);
  }, [expenses, shares, members]);

  const handleRemind = (userId, name) => {
    toast.success(`Reminder sent to ${name}`);
  };

  if (!transactions || transactions.length === 0) {
    return (
      <div className="card fade-up flex flex-col items-center justify-center p-8 text-center border-dashed border-2 border-[var(--bdr)] bg-transparent shadow-none">
        <h3 className="text-[var(--tx)] font-semibold mb-1">Balances settled</h3>
        <p className="text-[var(--tx3)] text-sm">You are all squared up.</p>
      </div>
    );
  }

  let myBalance = 0;
  transactions.forEach(t => {
    if (t.from === user?.$id) myBalance -= t.amount;
    if (t.to === user?.$id) myBalance += t.amount;
  });

  return (
    <div className="card fade-up overflow-hidden">
      <div className="p-5 border-b border-[var(--bdr)] bg-[var(--sur2)] flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-lg text-[var(--tx)]">Current balances</h3>
          <p className="text-xs text-[var(--tx3)]">Net balances across all group members</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-[var(--tx2)] mb-0.5">Your balance</p>
          <div className={`font-bold text-lg ${myBalance > 0 ? 'text-emerald-600 dark:text-emerald-400' : myBalance < 0 ? 'text-[var(--p)]' : 'text-[var(--tx)]'}`}>
            {myBalance > 0 ? '+' : ''}{myBalance.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="p-2 flex flex-col gap-1">
        {transactions.map((t, idx) => {
          const amIOwing = t.from === user?.$id;
          const amIOwed = t.to === user?.$id;
          
          return (
            <div key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--sur2)] transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full border-2 border-[var(--sur)] bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[var(--tx)] text-[10px] font-bold z-10">
                    {t.fromName.charAt(0).toUpperCase()}
                  </div>
                  <div className="w-8 h-8 rounded-full border-2 border-[var(--sur)] bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-[var(--tx)] text-[10px] font-bold z-0">
                    {t.toName.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm">
                    <strong className={amIOwing ? "text-[var(--p)]" : "text-[var(--tx)]"}>{amIOwing ? 'You' : t.fromName}</strong> 
                    <span className="text-[var(--tx3)] mx-1">owes</span> 
                    <strong className={amIOwed ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--tx)]"}>{amIOwed ? 'You' : t.toName}</strong>
                  </span>
                  <span className="font-semibold text-[var(--tx)]">₹{t.amount.toFixed(2)}</span>
                </div>
              </div>

              {amIOwed && (
                <button 
                  onClick={() => handleRemind(t.from, t.fromName)}
                  className="btn btn-ghost text-xs py-1.5 px-3 border border-[var(--bdr)] text-[var(--tx2)] hover:text-[var(--tx)] rounded-lg transition-all"
                >
                  Remind
                </button>
              )}
              {amIOwing && (
                <button 
                  className="btn text-xs py-1.5 px-3 rounded-lg shadow-sm bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition-all"
                  onClick={() => toast.success('Payment initiated')}
                >
                  Pay now
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
