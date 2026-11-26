import React, { useMemo, useState } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { calculateNetBalances, optimizeSettlements } from '../../../utils/expenseMath';
import toast from 'react-hot-toast';

export default function SettlementSummary({ expenses, shares, members }) {
  const { user } = useAuthStore();
  const [upiModal, setUpiModal] = useState(null);

  const memberMap = useMemo(() => {
    return (members || []).reduce((acc, m) => {
      acc[m.$id] = m;
      return acc;
    }, {});
  }, [members]);

  const transactions = useMemo(() => {
    if (!expenses || !shares || !members) return [];
    const balances = calculateNetBalances(expenses, shares);
    return optimizeSettlements(balances, memberMap);
  }, [expenses, shares, members, memberMap]);

  const handleRemind = (_userId, name) => {
    toast.success(`Reminder sent to ${name}`);
  };

  const handlePayNow = (t) => {
    const creditor = memberMap[t.to];
    if (!creditor?.upiId) {
      toast.error(`${t.toName} hasn't added their UPI ID in Edit Profile yet.`);
      return;
    }
    const upiUri = `upi://pay?pa=${encodeURIComponent(creditor.upiId)}&pn=${encodeURIComponent(t.toName)}&am=${t.amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Roomie Finder Settlement')}`;
    setUpiModal({
      toName: t.toName,
      upiId: creditor.upiId,
      amount: t.amount.toFixed(2),
      upiUri,
    });
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
    <>
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
                    onClick={() => handlePayNow(t)}
                    className="btn btn-p text-xs py-1.5 px-3 rounded-lg shadow-sm transition-all"
                  >
                    Pay via UPI
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {upiModal && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: 20,
          }}
        >
          <div className="auth-card fade-up text-center" style={{ maxWidth: 380, padding: 28 }}>
            <h3 className="text-lg font-bold m-0 mb-1">Pay {upiModal.toName}</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--tx2)' }}>
              Amount: <strong style={{ color: 'var(--p)' }}>₹{upiModal.amount}</strong> • UPI: <code>{upiModal.upiId}</code>
            </p>
            <div className="flex justify-center mb-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiModal.upiUri)}`}
                alt="UPI QR Code"
                className="rounded-xl border p-2 bg-white"
                style={{ width: 196, height: 196, borderColor: 'var(--bdr)' }}
              />
            </div>
            <p className="text-xs mb-4" style={{ color: 'var(--tx3)' }}>
              Scan with GPay / PhonePe / Paytm, or tap below on mobile.
            </p>
            <div className="flex gap-2">
              <a href={upiModal.upiUri} className="btn btn-p flex-1 justify-center no-underline text-sm">
                Open UPI App
              </a>
              <button type="button" onClick={() => setUpiModal(null)} className="btn btn-o text-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
