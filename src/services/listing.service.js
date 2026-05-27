import {
  databases,
  storage,
  ID,
  DATABASE_ID,
  COL_LISTING,
  BUCKET_ID,
} from "./appwrite";
import { Query, Permission, Role } from "appwrite";

export const uploadImages = async (files) => {
  const uploaded = [];
  const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp"];

  for (const file of files) {
    const fileExtension = file.name.split(".").pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      throw new Error(
        `The file extension .${fileExtension} is not allowed. Please upload a ${ALLOWED_EXTENSIONS.join(", ")} file.`,
      );
    }

    const res = await storage.createFile({
      bucketId: BUCKET_ID,
      fileId: ID.unique(),
      file,
      permissions: [Permission.read(Role.any())],
    });
    uploaded.push(res.$id);
  }

  return uploaded;
};

export const createListing = async (data) => {
  return await databases.createRow({
    databaseId: DATABASE_ID,
    tableId: COL_LISTING,
    rowId: ID.unique(),
    data,
    permissions: [
      Permission.read(Role.any()),
      Permission.update(Role.user(data.userId)),
      Permission.delete(Role.user(data.userId)),
    ],
  });
};
export const getFilePreview = (fileId) => {
  return storage.getFileView({
    bucketId: BUCKET_ID,
    fileId: fileId,
  });
};

export const updateListing = async (id, data) => {
  return await databases.updateRow({
    databaseId: DATABASE_ID,
    tableId: COL_LISTING,
    rowId: id,
    data,
  });
};

export const getUserListings = async (userId) => {
  const res = await databases.listRows({
    databaseId: DATABASE_ID,
    tableId: COL_LISTING,
    queries: [Query.equal("userId", userId)],
  });
  return res.rows;
};

export const deleteListing = async (id) => {
  return await databases.deleteRow({
    databaseId: DATABASE_ID,
    tableId: COL_LISTING,
    rowId: id,
  });
};

export const getListingById = async (id) => {
  return await databases.getRow({
    databaseId: DATABASE_ID,
    tableId: COL_LISTING,
    rowId: id,
  });
};

export const getListings = async ({ pageParam = null, filters }) => {
  const limit = 6;
  const queries = [
    Query.equal("isAvailable", true),
    Query.orderDesc("$createdAt"),
  ];

  const hasFilters =
    filters?.minRent ||
    filters?.maxRent ||
    filters?.location ||
    filters?.preferences ||
    (filters?.amenities && filters.amenities.length > 0);

  if (hasFilters) {
    // Fetch a large batch to filter client-side, avoiding Appwrite strict index requirements
    queries.push(Query.limit(100));
  } else {
    queries.push(Query.limit(limit));
    if (pageParam) {
      queries.push(Query.cursorAfter(pageParam));
    }
  }

  const res = await databases.listRows({
    databaseId: DATABASE_ID,
    tableId: COL_LISTING,
    queries,
  });

  let docs = res.rows;

  if (hasFilters) {
    if (filters.minRent)
      docs = docs.filter((d) => Number(d.rent) >= Number(filters.minRent));
    if (filters.maxRent)
      docs = docs.filter((d) => Number(d.rent) <= Number(filters.maxRent));
    if (filters.location) {
      const loc = filters.location.toLowerCase();
      docs = docs.filter(
        (d) => d.location && d.location.toLowerCase().includes(loc),
      );
    }
    if (filters.preferences)
      docs = docs.filter((d) => d.preferences === filters.preferences);
    if (filters.amenities && filters.amenities.length > 0) {
      docs = docs.filter((d) => {
        if (!d.amenities) return false;
        const listingAmens = d.amenities
          .split(",")
          .map((a) => a.trim().toLowerCase());
        return filters.amenities.every((reqAmen) =>
          listingAmens.includes(reqAmen.toLowerCase()),
        );
      });
    }

    // Client-side pagination
    const startIndex = pageParam
      ? docs.findIndex((d) => d.$id === pageParam) + 1
      : 0;
    const paginatedDocs = docs.slice(startIndex, startIndex + limit);
    const lastDoc = paginatedDocs[paginatedDocs.length - 1];

    return {
      documents: paginatedDocs,
      nextPage:
        paginatedDocs.length === limit && startIndex + limit < docs.length
          ? lastDoc.$id
          : undefined,
    };
  }

  const lastDoc = docs[docs.length - 1];
  return {
    documents: docs,
    nextPage: docs.length === limit && lastDoc ? lastDoc.$id : undefined,
  };
};
