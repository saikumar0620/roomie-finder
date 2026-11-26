export const serializeUser = (row) => ({
  $id: row.id,
  id: row.id,
  email: row.email,
  name: row.name,
  $createdAt: row.createdAt,
});

export const serializeProfile = (row) => ({
  $id: row.id,
  id: row.id,
  userId: row.userId,
  name: row.name,
  bio: row.bio,
  habits: row.habits,
  avatarId: row.avatarUrl,
  avatarUrl: row.avatarUrl,
  upiId: row.upiId ?? null,
  lookingForRoom: row.lookingForRoom,
  $createdAt: row.createdAt,
  $updatedAt: row.updatedAt,
});

export const serializeListing = (row) => ({
  $id: row.id,
  id: row.id,
  userId: row.userId ?? row.user_id,
  title: row.title,
  rent: row.rent,
  location: row.location,
  latitude: row.latitude ?? null,
  longitude: row.longitude ?? null,
  distanceKm:
    row.distance_km !== undefined && row.distance_km !== null
      ? Math.round(Number(row.distance_km) * 10) / 10
      : null,
  description: row.description,
  preferences: row.preferences,
  amenities: Array.isArray(row.amenities)
    ? row.amenities.join(", ")
    : row.amenities || "",
  images: row.images || [],
  isAvailable: row.isAvailable ?? row.is_available,
  ownerName: row.user?.profile?.name ?? row.user?.name,
  ownerAvatarUrl: row.user?.profile?.avatarUrl ?? null,
  $createdAt: row.createdAt ?? row.created_at,
  $updatedAt: row.updatedAt ?? row.updated_at,
});

export const serializeFavorite = (row) => ({
  $id: row.id,
  id: row.id,
  userId: row.userId,
  listingId: row.listingId,
  $createdAt: row.createdAt,
});

export const serializeConversation = (row) => ({
  $id: row.id,
  id: row.id,
  listingId: row.listingId || "general",
  user1Id: row.user1Id,
  user2Id: row.user2Id,
  listingTitle: row.listing?.title ?? null,
  unreadCount: row._count?.messages ?? 0,
  $createdAt: row.createdAt,
  $updatedAt: row.updatedAt,
});

export const serializeMessage = (row) => ({
  $id: row.id,
  id: row.id,
  conversationId: row.conversationId,
  senderId: row.senderId,
  text: row.text,
  isRead: row.isRead ?? false,
  $createdAt: row.createdAt,
});

export const serializeExpense = (row) => ({
  $id: row.id,
  id: row.id,
  room_id: row.roomId,
  created_by: row.createdBy,
  amount: Number(row.amount),
  category: row.category,
  split_method: row.splitMethod,
  description: row.description,
  $createdAt: row.createdAt,
});

export const serializeExpenseShare = (row) => ({
  $id: row.id,
  id: row.id,
  expense_id: row.expenseId,
  user_id: row.userId,
  share_amount: Number(row.shareAmount),
  is_paid: row.isPaid,
});

export const serializeRecurringBill = (row) => ({
  $id: row.id,
  id: row.id,
  room_id: row.roomId,
  created_by: row.createdBy,
  amount: Number(row.amount),
  description: row.description,
  interval: row.interval,
  due_date: row.dueDate,
  $createdAt: row.createdAt,
});
