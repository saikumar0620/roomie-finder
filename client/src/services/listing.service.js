import { api, SERVER_URL } from "./api";

export const uploadImages = async (files) => {
  const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
  const formData = new FormData();

  for (const file of files) {
    const fileExtension = file.name.split(".").pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      throw new Error(
        `The file extension .${fileExtension} is not allowed. Please upload a ${ALLOWED_EXTENSIONS.join(", ")} file.`
      );
    }
    formData.append("images", file);
  }

  const { data } = await api.post("/uploads/images", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.urls;
};

export const createListing = async (listingData) => {
  const { data } = await api.post("/listings", listingData);
  return data.listing;
};

export const getFilePreview = (filePath) => {
  if (!filePath) return "";
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return filePath;
  }
  return `${SERVER_URL}${filePath.startsWith("/") ? "" : "/"}${filePath}`;
};

export const updateListing = async (id, listingData) => {
  const { data } = await api.patch(`/listings/${id}`, listingData);
  return data.listing;
};

export const getUserListings = async () => {
  const { data } = await api.get("/listings/mine");
  return data.listings;
};

export const deleteListing = async (id) => {
  const { data } = await api.delete(`/listings/${id}`);
  return data;
};

export const getListingById = async (id) => {
  const { data } = await api.get(`/listings/${id}`);
  return data.listing;
};

export const reportListing = async (id, reason, details = "") => {
  const { data } = await api.post(`/listings/${id}/report`, { reason, details });
  return data.report;
};

export const requestVisit = async (id, visitDate, note = "") => {
  const { data } = await api.post(`/listings/${id}/visit`, { visitDate, note });
  return data;
};

export const getListings = async ({ pageParam = 1, filters = {} }) => {
  const params = {
    page: pageParam || 1,
    limit: 6,
  };

  if (filters.minRent) params.minRent = filters.minRent;
  if (filters.maxRent) params.maxRent = filters.maxRent;
  if (filters.location) params.location = filters.location;
  if (filters.preferences) params.preferences = filters.preferences;
  if (filters.amenities?.length) {
    params.amenities = filters.amenities.join(",");
  }
  if (filters.lat !== undefined && filters.lng !== undefined) {
    params.lat = filters.lat;
    params.lng = filters.lng;
    params.radiusKm = filters.radiusKm || 5;
  }

  const { data } = await api.get("/listings", { params });
  return data;
};
