import { useInfiniteQuery } from "@tanstack/react-query";
import { getListings } from "../services/listing.service";

export const useListings = (filters) => {
  return useInfiniteQuery({
    queryKey: ["listings", filters],
    queryFn: ({ pageParam }) => getListings({ pageParam, filters }),
    initialPageParam: null, // cursor-based: start with no cursor
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,

    staleTime: 1000 * 60 * 2,     // 2 min cache
    gcTime: 1000 * 60 * 5,         // v5 uses gcTime instead of cacheTime
    refetchOnWindowFocus: false,
    retry: 1,
  });
};