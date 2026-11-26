import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getFavorites,
  addFavorite,
  removeFavorite,
} from "../services/favorite.service";
import { useAuthStore } from "../store/useAuthStore";

export const useFavorites = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: favorites = [] } = useQuery({
    queryKey: ["favorites", user?.$id],
    queryFn: () => getFavorites(user.$id),
    enabled: !!user,
  });

const addMutation = useMutation({
  mutationFn: async ({ listingId }) => {
    const exists = favorites.find(f => f.listingId === listingId);
    if (exists) return;
    return addFavorite(user.$id, listingId);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["favorites"] });
  },
});

  const removeMutation = useMutation({
    mutationFn: ({ docId }) => removeFavorite(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  const isFavorite = (listingId) => {
    return favorites.find((f) => f.listingId === listingId);
  };

  return {
    favorites,
    addFavorite: addMutation.mutate,
    removeFavorite: removeMutation.mutate,
    isFavorite,
  };
};