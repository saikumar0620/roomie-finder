import React from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { useUpdateShareStatus } from '../../../hooks/useExpenses';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export default function ExpenseList({ roomId, expenses, shares, members }) {
  const { user } = useAuthStore();
  const updateStatusMutation = useUpdateShareStatus(roomId);

  const getMember = (id) => members.find(m => m.$id === id) || { name: 'Unknown' };

  const handleMarkPaid = async (shareId, currentStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ shareId, is_paid: !currentStatus });
    } catch (e) {
      console.error(e);
    }
  };

  if (!expenses || expenses.length === 0) {
    return (
      <div className="card fade-up p-6 text-center text-[var(--tx2)] border-dashed">
        No expenses found.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 fade-up">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--tx)] tracking-tight">Recent expenses</h3>
        <span className="text-xs font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full">
          {expenses.length} Total
        </span>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        {expenses.map(expense => {
          const expenseShares = shares.filter(s => s.expense_id === expense.$id);
          const creator = getMember(expense.created_by);
          const isCreator = user?.$id === expense.created_by;

          const totalPaid = expenseShares.reduce((sum, s) => s.is_paid ? sum + parseFloat(s.share_amount) : sum, 0);
          const progress = (totalPaid / expense.amount) * 100;

          return (
            <div key={expense.$id} className="group flex flex-col bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm transition-all hover:shadow-md">
              {/* Header section */}
              <div className="p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/50 flex items-center justify-center text-xl shadow-sm">
                    {expense.category === 'Rent' ? '🏠' : 
                     expense.category === 'Utilities' ? '⚡' : 
                     expense.category === 'Groceries' ? '🛒' : '🧾'}
                  </div>
                  <div className="flex flex-col">
                    <h4 className="font-semibold text-[var(--tx)] text-base tracking-tight">{expense.description}</h4>
                    <p className="text-xs text-[var(--tx3)] mt-0.5 flex items-center gap-1.5">
                      <span>Paid by <strong className="text-[var(--tx2)] font-medium">{isCreator ? 'You' : creator.name}</strong></span>
                      <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                      <span>{new Date(expense.$createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </p>
                  </div>
                </div>
                
                <div className="text-right flex flex-col items-end">
                  <div className="font-bold text-lg text-[var(--tx)] tracking-tight">₹{expense.amount.toFixed(2)}</div>
                  <div className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 mt-1 rounded text-zinc-500 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400">
                    {expense.split_method.replace('_', ' ')}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-zinc-100 dark:bg-zinc-800/50 h-1">
                <div 
                  className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Shares Detail - styled as a subtle list */}
              <div className="bg-zinc-50/50 dark:bg-[#0a0a0a]/50 p-5 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1">Split Details</p>
                
                {expenseShares.map(share => {
                  const member = getMember(share.user_id);
                  const isMe = share.user_id === user?.$id;
                  const canToggle = isCreator || isMe;
                  
                  return (
                    <div key={share.$id} className="flex justify-between items-center group/share">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-600 dark:text-zinc-300">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <span className={clsx("text-sm font-medium", isMe ? "text-[var(--tx)]" : "text-[var(--tx2)]")}>
                          {isMe ? 'You' : member.name}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className="font-medium text-sm tracking-tight text-[var(--tx)]">₹{parseFloat(share.share_amount).toFixed(2)}</span>
                        
                        {canToggle ? (
                          <button
                            onClick={() => handleMarkPaid(share.$id, share.is_paid)}
                            disabled={updateStatusMutation.isPending}
                            className={clsx(
                              "text-xs px-3 py-1.5 rounded-md transition-all font-medium min-w-[70px] shadow-sm",
                              share.is_paid 
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50 dark:hover:bg-emerald-900/40" 
                                : "bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-700 dark:hover:bg-zinc-800"
                            )}
                          >
                            {share.is_paid ? 'Paid ✓' : 'Settle'}
                          </button>
                        ) : (
                          <span className={clsx(
                            "text-xs px-3 py-1.5 rounded-md font-medium min-w-[70px] text-center border",
                            share.is_paid 
                              ? "bg-transparent border-transparent text-emerald-600 dark:text-emerald-500" 
                              : "bg-transparent border-transparent text-zinc-400 dark:text-zinc-500"
                          )}>
                            {share.is_paid ? 'Paid' : 'Unpaid'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
