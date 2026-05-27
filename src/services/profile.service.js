import { databases, storage, ID, DATABASE_ID, BUCKET_ID, COL_PROFILES } from "./appwrite";
import { Query, Permission, Role } from "appwrite";

export const getProfile = async (userId) => {
  if (!COL_PROFILES) return null;
  const res = await databases.listRows({
    databaseId: DATABASE_ID,
    tableId: COL_PROFILES,
    queries: [Query.equal("userId", userId)]
  });
  return res.rows[0] || null;
};

export const upsertProfile = async (userId, data, existingDocId) => {
  if (existingDocId) {
    return await databases.updateRow({
      databaseId: DATABASE_ID,
      tableId: COL_PROFILES,
      rowId: existingDocId,
      data
    });
  }
  
  return await databases.createRow({
    databaseId: DATABASE_ID,
    tableId: COL_PROFILES,
    rowId: ID.unique(),
    data: { ...data, userId },
    permissions: [
      Permission.read(Role.any()),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId))
    ]
  });
};

export const uploadAvatar = async (file) => {
  const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  const fileExtension = file.name.split('.').pop().toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
    throw new Error(`The file extension .${fileExtension} is not allowed. Please upload a ${ALLOWED_EXTENSIONS.join(', ')} file.`);
  }

  const res = await storage.createFile({
    bucketId: BUCKET_ID,
    fileId: ID.unique(),
    file,
    permissions: [Permission.read(Role.any())]
  });
  return res.$id;
};

export const getRoommatesWanted = async () => {
  if (!COL_PROFILES) return [];
  const res = await databases.listRows({
    databaseId: DATABASE_ID,
    tableId: COL_PROFILES,
    queries: [
      Query.equal("lookingForRoom", true),
      Query.orderDesc("$updatedAt"),
      Query.limit(50)
    ]
  });
  return res.rows;
};
