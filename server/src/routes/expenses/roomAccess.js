import { prisma } from "../../config/db.js";
import { HttpError } from "../../middleware/errorHandler.js";

export async function assertRoomMember(roomId, userId) {
  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  if (!member) {
    throw new HttpError(403, "You are not a member of this room");
  }
}
