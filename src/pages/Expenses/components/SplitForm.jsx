import React, { useState } from 'react';
import { useExpenseStore } from '../../../store/useExpenseStore';
import { useCreateExpense } from '../../../hooks/useExpenses';
import { useAuthStore } from '../../../store/useAuthStore';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export default function SplitForm({ roomId, members }) {
  const { user } = useAuthStore();
  const { 
    splitMethod, setSplitMethod,
    newExpenseTotal, setNewExpenseTotal,
    newExpenseCategory, setNewExpenseCategory,
    newExpenseDescription, setNewExpenseDescription,
    customShares, setCustomShare,
    resetForm
  } = useExpenseStore();

  const createExpenseMutation = useCreateExpense(roomId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate shares based on the selected method
  const validateShares = () => {
    const total = parseFloat(newExpenseTotal);
    if (isNaN(total) || total <= 0) {
      toast.error('Please enter a valid total amount');
      return false;
    }

    if (!newExpenseDescription.trim()) {
      toast.error('Please add a description for the expense');
      return false;
    }

    if (splitMethod === 'custom_amount') {
      const sumShares = members.reduce((sum, member) => {
        return sum + (parseFloat(customShares[member.$id]) || 0);
      }, 0);
      
      // Allow a tiny epsilon for float comparison
      if (Math.abs(sumShares - total) > 0.01) {
        toast.error(`Custom amounts must sum to ${total}. Current sum: ${sumShares.toFixed(2)}`);
        return false;
      }
    } else if (splitMethod === 'custom_percentage') {
      const sumPercent = members.reduce((sum, member) => {
        return sum + (parseFloat(customShares[member.$id]) || 0);
      }, 0);

      if (Math.abs(sumPercent - 100) > 0.01) {
        toast.error(`Percentages must sum exactly to 100%. Current sum: ${sumPercent.toFixed(2)}%`);
        return false;
      }
    }

    return true;
  };

  const calculateFinalShares = () => {
    const total = parseFloat(newExpenseTotal);
    const shares = [];

    members.forEach(member => {
      let shareAmount = 0;
      
      if (splitMethod === 'equal') {
        shareAmount = total / members.length;
      } else if (splitMethod === 'custom_amount') {
        shareAmount = parseFloat(customShares[member.$id]) || 0;
      } else if (splitMethod === 'custom_percentage') {
        const percent = parseFloat(customShares[member.$id]) || 0;
        shareAmount = (percent / 100) * total;
      }

      shares.push({
        user_id: member.$id,
        share_amount: Math.round(shareAmount * 100) / 100, // Round to 2 decimals
        is_paid: member.$id === user.$id // Creator's share is implicitly paid
      });
    });

    return shares;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateShares()) return;

    setIsSubmitting(true);
    const total = parseFloat(newExpenseTotal);
    
    const expenseData = {
      amount: total,
      category: newExpenseCategory,
      split_method: splitMethod,
      created_by: user.$id,
      room_id: roomId,
      description: newExpenseDescription,
    };

    const sharesData = calculateFinalShares();

    try {
      await createExpenseMutation.mutateAsync({ expenseData, sharesData });
      resetForm();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card fade-up" style={{ padding: 24 }}>
      <h3 className="section-title mb-6 text-xl">Add expense</h3>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="lbl">Total amount</label>
            <input 
              type="number" 
              className="inp text-lg font-semibold" 
              placeholder="0.00"
              step="0.01"
              value={newExpenseTotal}
              onChange={(e) => setNewExpenseTotal(e.target.value)}
            />
          </div>
          <div>
            <label className="lbl">Category</label>
            <select 
              className="inp appearance-none"
              value={newExpenseCategory}
              onChange={(e) => setNewExpenseCategory(e.target.value)}
            >
              <option value="Rent">Rent</option>
              <option value="Utilities">Utilities</option>
              <option value="Groceries">Groceries</option>
              <option value="Internet">Internet</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="lbl">Description</label>
          <input 
            type="text" 
            className="inp" 
            placeholder="e.g. Electricity"
            value={newExpenseDescription}
            onChange={(e) => setNewExpenseDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="lbl">Split method</label>
          <div className="flex gap-2 p-1 bg-[var(--sur2)] rounded-xl border border-[var(--bdr)]">
            {['equal', 'custom_percentage', 'custom_amount'].map(method => (
              <button
                key={method}
                type="button"
                className={clsx(
                  "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                  splitMethod === method 
                    ? "bg-[var(--sur)] shadow-sm text-[var(--tx)] border border-[var(--bdr)]" 
                    : "text-[var(--tx2)] hover:text-[var(--tx)] hover:bg-[var(--sur)]/50"
                )}
                onClick={() => setSplitMethod(method)}
              >
                {method === 'equal' && 'Equally'}
                {method === 'custom_percentage' && 'Percentage'}
                {method === 'custom_amount' && 'Exact amount'}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-zinc-50/50 dark:bg-[#0a0a0a]/50 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800/80 flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1">Split details</p>
          {members.map(member => (
            <div key={member.$id} className="flex items-center justify-between gap-4 group/member">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-600 dark:text-zinc-300 shadow-sm transition-colors group-hover/member:border-zinc-400 dark:group-hover/member:border-zinc-500">
                  {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                </div>
                <span className="text-sm font-medium truncate w-24 md:w-32 text-[var(--tx)]">
                  {member.name} {member.$id === user.$id && <span className="text-zinc-400 dark:text-zinc-500 font-normal ml-1">(You)</span>}
                </span>
              </div>
              
              <div className="w-2/5 flex justify-end">
                {splitMethod === 'equal' ? (
                  <div className="text-right text-sm font-medium text-[var(--tx)] bg-white dark:bg-[#121212] px-4 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 shadow-sm min-w-[80px]">
                    ₹{newExpenseTotal && !isNaN(parseFloat(newExpenseTotal)) 
                      ? (parseFloat(newExpenseTotal) / members.length).toFixed(2) 
                      : '0.00'}
                  </div>
                ) : (
                  <div className="relative w-full max-w-[120px]">
                    <input 
                      type="number" 
                      step="0.01"
                      className="w-full bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-600 rounded-md py-1.5 pl-3 pr-8 text-right text-sm font-medium text-[var(--tx)] outline-none transition-colors shadow-sm"
                      placeholder="0.00"
                      value={customShares[member.$id] || ''}
                      onChange={(e) => setCustomShare(member.$id, e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-medium pointer-events-none">
                      {splitMethod === 'custom_percentage' ? '%' : '₹'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="btn w-full mt-2 justify-center bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 border-none shadow-sm transition-all"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
              Saving...
            </span>
          ) : (
            'Save expense'
          )}
        </button>
      </form>
    </div>
  );
}
