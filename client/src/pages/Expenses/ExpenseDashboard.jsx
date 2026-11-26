import React, { useMemo } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useRoomExpenses, useRoomExpenseShares } from '../../hooks/useExpenses';
import SplitForm from './components/SplitForm';
import SettlementSummary from './components/SettlementSummary';
import ExpenseList from './components/ExpenseList';
import RecurringBills from './components/RecurringBills';

const DEMO_ROOM_ID = "room_demo_123";

export default function ExpenseDashboard() {
  const { user } = useAuthStore();
  
  // Use a mock room ID for the demo since full "Groups" aren't implemented in DB yet
  const roomId = DEMO_ROOM_ID;

  const { data: expenses = [], isLoading: isLoadingExp, isFetching: isFetchingExp } = useRoomExpenses(roomId);
  const { data: shares = [], isLoading: isLoadingShares, isFetching: isFetchingShares } = useRoomExpenseShares(roomId);

  // Mock members for the demo room. In a real app, this comes from a Room/Group collection.
  const members = useMemo(() => {
    if (!user) return [];
    return [
      { $id: user.$id, name: user.name || 'You' },
      { $id: 'mock_user_a', name: 'Roommate A' },
      { $id: 'mock_user_b', name: 'Roommate B' }
    ];
  }, [user]);

  if (!user) {
    return (
      <div className="wrap flex justify-center items-center" style={{ minHeight: '60vh' }}>
        <p className="text-[var(--tx2)]">Please login to view expenses.</p>
      </div>
    );
  }

  const isLoading = isLoadingExp || isLoadingShares;
  const isSyncing = isFetchingExp || isFetchingShares;

  return (
    <div className="wrap py-8 max-w-5xl">
      <div className="fade-up mb-8 text-center md:text-left">
        <div className="flex flex-col md:flex-row items-center gap-4 mb-2">
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--tx)]">
            Expenses
          </h1>
          {isSyncing && !isLoading && (
            <div className="flex items-center gap-2 px-3 py-1 bg-[var(--sur2)] rounded-full border border-[var(--bdr)] text-xs text-[var(--tx2)] font-medium shadow-sm" style={{ animation: "fadeUp 0.3s ease" }}>
              <span className="w-2 h-2 rounded-full bg-[var(--p)]" style={{ animation: "pulse 1.5s infinite" }}></span>
              Syncing
            </div>
          )}
        </div>
        <p className="text-[var(--tx2)] text-sm md:text-base mt-2">
          Track shared expenses and settle balances.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="skel h-[500px] w-full rounded-2xl"></div>
          </div>
          <div className="space-y-6">
            <div className="skel h-[300px] w-full rounded-2xl"></div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          
          {/* Main Action Area */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            <SplitForm roomId={roomId} members={members} />
            
            <div className="divider opacity-50"></div>
            
            <ExpenseList 
              roomId={roomId} 
              expenses={expenses} 
              shares={shares} 
              members={members} 
            />
          </div>

          {/* Sidebar Area */}
          <div className="flex flex-col gap-6 md:gap-8">
            <SettlementSummary 
              expenses={expenses} 
              shares={shares} 
              members={members} 
            />
            
            <RecurringBills roomId={roomId} />
          </div>
          
        </div>
      )}
    </div>
  );
}
