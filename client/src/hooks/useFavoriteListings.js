import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getListingById } from "../services/listing.service";
import { useFavorites } from "./useFavorites";
import { removeFavorite } from "../services/favorite.service";

export const useFavoriteListings = () => {
  const { favorites } = useFavorites();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["favoriteListings", favorites.map((f) => f.listingId)],
    queryFn: async () => {
      if (favorites.length === 0) return [];
      const promises = favorites.map(async (f) => {
        try {
          return await getListingById(f.listingId);
        } catch (error) {
          // If a listing is deleted, it throws a 404.
          // Clean up the orphaned favorite so it doesn't keep 404ing.
          if (error?.code === 404) {
            try {
              await removeFavorite(f.$id);
            } catch (e) {
              // Ignore cleanup errors
            }
          }
          return null;
        }
      });
      const listings = await Promise.all(promises);
      
      if (listings.includes(null)) {
        // Invalidate favorites so the UI updates and removes the orphan
        queryClient.invalidateQueries({ queryKey: ["favorites"] });
      }

      return listings.filter(Boolean); // Filter out nulls
    },
    enabled: favorites.length > 0,
    initialData: [], // Default to empty array if no favorites
  });
};
