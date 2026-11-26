import { useState } from 'react';
import {
  useCreateChore,
  useToggleChore,
  useDeleteChore,
} from '../../../hooks/useExpenses';

export default function ChoreBoard({ roomId, chores = [], members = [] }) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  const createChore = useCreateChore(roomId);
  const toggleChore = useToggleChore(roomId);
  const deleteChore = useDeleteChore(roomId);

  const memberMap = members.reduce((acc, m) => {
    acc[m.$id] = m.name;
    return acc;
  }, {});

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createChore.mutateAsync({
      title: title.trim(),
      assignedTo: assignedTo || null,
    });
    setTitle('');
    setAssignedTo('');
    setShowForm(false);
  };

  return (
    <div className="card fade-up">
      <div className="p-5 border-b border-[var(--bdr)] flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-lg text-[var(--tx)]">Room Chores</h3>
          <p className="text-xs text-[var(--tx3)]">Keep shared spaces tidy</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="text-sm font-medium text-[var(--tx2)] hover:text-[var(--tx)] transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="p-4 border-b border-[var(--bdr)] bg-[var(--sur2)] flex flex-col gap-3">
          <input
            type="text"
            className="inp py-2 text-sm"
            placeholder="e.g. Take out trash, Clean kitchen"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <select
            className="inp py-2 text-sm"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
          >
            <option value="">Assign to anyone</option>
            {members.map((m) => (
              <option key={m.$id} value={m.$id}>
                {m.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={createChore.isPending}
            className="btn btn-p text-sm py-2"
          >
            {createChore.isPending ? 'Adding...' : 'Add Chore'}
          </button>
        </form>
      )}

      <div className="p-3 flex flex-col gap-1.5">
        {chores.length === 0 ? (
          <p className="text-center text-[var(--tx3)] text-sm py-4">
            No chores added yet.
          </p>
        ) : (
          chores.map((chore) => (
            <div
              key={chore.id}
              className="flex items-center justify-between gap-2 p-2.5 rounded-xl hover:bg-[var(--sur2)] transition-colors"
            >
              <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                <input
                  type="checkbox"
                  checked={chore.isDone}
                  onChange={() =>
                    toggleChore.mutate({ choreId: chore.id, isDone: !chore.isDone })
                  }
                  className="w-4 h-4 accent-[var(--p)] cursor-pointer shrink-0"
                />
                <div className="min-w-0">
                  <div
                    className={`text-sm font-medium truncate ${
                      chore.isDone ? 'line-through text-[var(--tx3)]' : 'text-[var(--tx)]'
                    }`}
                  >
                    {chore.title}
                  </div>
                  {chore.assignedTo && memberMap[chore.assignedTo] && (
                    <div className="text-[11px] text-[var(--tx2)]">
                      Assigned to {memberMap[chore.assignedTo]}
                    </div>
                  )}
                </div>
              </label>
              <button
                type="button"
                onClick={() => deleteChore.mutate(chore.id)}
                className="text-xs px-2 py-1 rounded-lg border-0 bg-transparent cursor-pointer text-[var(--tx3)] hover:text-[var(--p)]"
                title="Delete chore"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
