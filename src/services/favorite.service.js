import { databases, ID, DATABASE_ID, COL_FAVORITES } from "./appwrite";
import { Query, Permission, Role } from "appwrite";

// Get user's favorites
export const getFavorites = async (userId) => {
  const res = await databases.listDocuments(
    DATABASE_ID,
    COL_FAVORITES,
    [Query.equal("userId", userId)]
  );
  return res.documents;
};

// Add favorite
export const addFavorite = async (userId, listingId) => {
  return await databases.createDocument(
    DATABASE_ID,
    COL_FAVORITES,
    ID.unique(),
    {
      userId,
      listingId,
    },
    [
      Permission.read(Role.user(userId)),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId)),
    ]
  );
};

// Remove favorite
export const removeFavorite = async (docId) => {
  return await databases.deleteDocument(
    DATABASE_ID,
    COL_FAVORITES,
    docId
  );
};