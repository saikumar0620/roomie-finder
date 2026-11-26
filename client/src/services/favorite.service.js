import { api } from "./api";

export const getFavorites = async () => {
  const { data } = await api.get("/favorites");
  return data.favorites;
};

export const addFavorite = async (_userId, listingId) => {
  const { data } = await api.post("/favorites", { listingId });
  return data.favorite;
};

export const removeFavorite = async (docId) => {
  const { data } = await api.delete(`/favorites/${docId}`);
  return data;
};
