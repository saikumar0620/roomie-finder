import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { asyncHandler, HttpError } from "../../middleware/errorHandler.js";
import { serializeRecurringBill } from "../../utils/serializers.js";
import { assertRoomMember } from "./roomAccess.js";

const router = Router();

const createBillSchema = z.object({
  room_id: z.string().uuid(),
  amount: z.coerce.number().positive(),
  description: z.string().trim().min(1).max(200),
  interval: z.enum(["Weekly", "Monthly", "Yearly"]),
  due_date: z.string().datetime(),
});

const createChoreSchema = z.object({
  title: z.string().trim().min(1).max(160),
  assignedTo: z.string().uuid().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
});

const updateChoreSchema = z.object({
  isDone: z.boolean(),
});

router.get(
  "/rooms/:roomId/recurring-bills",
  asyncHandler(async (req, res) => {
    await assertRoomMember(req.params.roomId, req.user.id);
    const bills = await prisma.recurringBill.findMany({
      where: { roomId: req.params.roomId },
      orderBy: { dueDate: "asc" },
    });
    res.json({ bills: bills.map(serializeRecurringBill) });
  })
);

router.post(
  "/recurring-bills",
  asyncHandler(async (req, res) => {
    const data = createBillSchema.parse(req.body);
    await assertRoomMember(data.room_id, req.user.id);
    const bill = await prisma.recurringBill.create({
      data: {
        roomId: data.room_id,
        createdBy: req.user.id,
        amount: data.amount,
        description: data.description,
        interval: data.interval,
        dueDate: new Date(data.due_date),
      },
    });
    res.status(201).json({ bill: serializeRecurringBill(bill) });
  })
);

router.post(
  "/rooms/:roomId/chores",
  asyncHandler(async (req, res) => {
    const data = createChoreSchema.parse(req.body);
    await assertRoomMember(req.params.roomId, req.user.id);

    const chore = await prisma.chore.create({
      data: {
        roomId: req.params.roomId,
        title: data.title,
        assignedTo: data.assignedTo ?? null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
    });
    res.status(201).json({ chore });
  })
);

router.patch(
  "/chores/:choreId",
  asyncHandler(async (req, res) => {
    const { isDone } = updateChoreSchema.parse(req.body);
    const existing = await prisma.chore.findUnique({
      where: { id: req.params.choreId },
    });
    if (!existing) {
      throw new HttpError(404, "Chore not found");
    }
    await assertRoomMember(existing.roomId, req.user.id);

    const chore = await prisma.chore.update({
      where: { id: req.params.choreId },
      data: { isDone },
    });
    res.json({ chore });
  })
);

router.delete(
  "/chores/:choreId",
  asyncHandler(async (req, res) => {
    const existing = await prisma.chore.findUnique({
      where: { id: req.params.choreId },
    });
    if (!existing) {
      throw new HttpError(404, "Chore not found");
    }
    await assertRoomMember(existing.roomId, req.user.id);

    await prisma.chore.delete({ where: { id: req.params.choreId } });
    res.json({ ok: true });
  })
);

export default router;
