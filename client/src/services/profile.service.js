import { api } from "./api";

export const getProfile = async (userId) => {
  if (!userId) return null;
  try {
    const { data } = await api.get(`/profiles/${userId}`);
    return data.profile;
  } catch (err) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
};

export const upsertProfile = async (_userId, profileData) => {
  const { data } = await api.put("/profiles", profileData);
  return data.profile;
};

export const uploadAvatar = async (file) => {
  const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp"];
  const fileExtension = file.name.split(".").pop().toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
    throw new Error(
      `The file extension .${fileExtension} is not allowed. Please upload a ${ALLOWED_EXTENSIONS.join(", ")} file.`
    );
  }

  const formData = new FormData();
  formData.append("avatar", file);
  const { data } = await api.post("/uploads/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.url;
};

export const getRoommatesWanted = async () => {
  const { data } = await api.get("/profiles/roommates");
  return data.profiles;
};
