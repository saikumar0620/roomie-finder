import { useQuery } from "@tanstack/react-query";
import { getUserListings } from "../services/listing.service";
import { useAuthStore } from "../store/useAuthStore";

export const useUserListings = () => {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ["myListings", user?.$id],
    queryFn: () => getUserListings(user.$id),
    enabled: !!user,
  });
};