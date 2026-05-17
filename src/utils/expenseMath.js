/**
 * Calculate net balances from a list of expenses and shares.
 * 
 * @param {Array} expenses - List of expense documents
 * @param {Array} shares - List of expense share documents
 * @returns {Object} Net balances keyed by user_id
 */
export const calculateNetBalances = (expenses, shares) => {
  const balances = {}; // { userId: netBalance (positive means they are owed, negative means they owe) }
  
  // Create a map for quick expense lookup
  const expenseMap = expenses.reduce((acc, exp) => {
    acc[exp.$id] = exp;
    return acc;
  }, {});

  // Iterate only over unpaid shares to calculate current outstanding debts
  shares.forEach(share => {
    if (!share.is_paid) {
      const expense = expenseMap[share.expense_id];
      if (!expense) return;

      const debtorId = share.user_id;
      const creditorId = expense.created_by;

      // If a user owes themselves, skip (edge case if someone splits their own bill equally)
      if (debtorId === creditorId) return;

      const amount = parseFloat(share.share_amount);

      // Initialize balances if they don't exist
      if (!balances[debtorId]) balances[debtorId] = 0;
      if (!balances[creditorId]) balances[creditorId] = 0;

      // Update balances
      balances[debtorId] -= amount;
      balances[creditorId] += amount;
    }
  });

  return balances;
};

/**
 * Optimizes debts to minimize the number of transactions.
 * Uses a greedy approach: matches largest debtor with largest creditor.
 * 
 * @param {Object} balances - Net balances object from calculateNetBalances
 * @param {Object} profilesMap - Map of userId to User Profile (for display names)
 * @returns {Array} List of optimized settlement transactions { from, to, amount }
 */
export const optimizeSettlements = (balances, profilesMap) => {
  const debtors = [];
  const creditors = [];

  // Separate into debtors and creditors
  for (const [userId, balance] of Object.entries(balances)) {
    // Round to 2 decimal places to handle JS floating point issues
    const roundedBalance = Math.round(balance * 100) / 100;
    
    if (roundedBalance < 0) {
      debtors.push({ id: userId, amount: Math.abs(roundedBalance) });
    } else if (roundedBalance > 0) {
      creditors.push({ id: userId, amount: roundedBalance });
    }
  }

  // Sort by amount descending to minimize transactions (greedy approach)
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions = [];
  let i = 0; // Debtors index
  let j = 0; // Creditors index

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const settledAmount = Math.min(debtor.amount, creditor.amount);
    
    // Safety check: Avoid zero-amount transactions
    if (settledAmount > 0) {
      transactions.push({
        from: debtor.id,
        fromName: profilesMap[debtor.id]?.name || 'Unknown User',
        to: creditor.id,
        toName: profilesMap[creditor.id]?.name || 'Unknown User',
        amount: Math.round(settledAmount * 100) / 100,
      });
    }

    debtor.amount -= settledAmount;
    creditor.amount -= settledAmount;

    // Move pointers if balance is settled (with a small epsilon for float comparison)
    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }

  return transactions;
};
