import React, { useState } from 'react';
import { useRoomRecurringBills, useCreateRecurringBill } from '../../../hooks/useExpenses';
import { useAuthStore } from '../../../store/useAuthStore';
import toast from 'react-hot-toast';

export default function RecurringBills({ roomId }) {
  const { user } = useAuthStore();
  const { data: bills = [], isLoading } = useRoomRecurringBills(roomId);
  const createBillMutation = useCreateRecurringBill(roomId);

  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [interval, setInterval] = useState('Monthly');
  const [nextDueDate, setNextDueDate] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !description || !nextDueDate) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      await createBillMutation.mutateAsync({
        amount: parseFloat(amount),
        description,
        interval,
        due_date: new Date(nextDueDate).toISOString(),
        room_id: roomId,
        created_by: user.$id
      });
      setShowForm(false);
      setAmount('');
      setDescription('');
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading) return <div className="skel h-32 w-full"></div>;

  return (
    <div className="card fade-up">
      <div className="p-5 border-b border-[var(--bdr)] flex justify-between items-center">
        <h3 className="font-semibold text-lg text-[var(--tx)]">
          Recurring bills
        </h3>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="text-sm font-medium text-[var(--tx2)] hover:text-[var(--tx)] transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-5 border-b border-[var(--bdr)] bg-[var(--sur2)] flex flex-col gap-4 animate-[fadeUp_0.2s_ease]">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="lbl">Amount (₹)</label>
              <input type="number" step="0.01" className="inp py-2 text-sm" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div>
              <label className="lbl">Interval</label>
              <select className="inp py-2 text-sm" value={interval} onChange={e => setInterval(e.target.value)}>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Yearly">Yearly</option>
              </select>
            </div>
          </div>
          <div>
            <label className="lbl">Description (e.g. Internet, Cleaning)</label>
            <input type="text" className="inp py-2 text-sm" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="lbl">Next due date</label>
            <input type="date" className="inp py-2 text-sm" value={nextDueDate} onChange={e => setNextDueDate(e.target.value)} />
          </div>
          <button type="submit" disabled={createBillMutation.isPending} className="btn text-sm py-2 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white border-none shadow-sm transition-all">
            {createBillMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </form>
      )}

      <div className="p-3 flex flex-col gap-2">
        {bills.length === 0 ? (
          <p className="text-center text-[var(--tx3)] text-sm py-4">No recurring bills set up.</p>
        ) : (
          bills.map(bill => (
            <div key={bill.$id} className="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--sur2)] transition-colors border border-transparent hover:border-[var(--bdr)]">
              <div>
                <h4 className="font-medium text-sm text-[var(--tx)]">{bill.description}</h4>
                <p className="text-xs text-[var(--tx3)] mt-1">
                  Due: <span className="font-medium text-[var(--tx2)]">{new Date(bill.due_date).toLocaleDateString()}</span> • {bill.interval}
                </p>
              </div>
              <div className="font-bold text-[var(--tx)]">
                ₹{bill.amount.toFixed(2)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
