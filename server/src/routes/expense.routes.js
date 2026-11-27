import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import roomRoutes from "./expenses/room.routes.js";
import inviteRoutes from "./expenses/invite.routes.js";
import billExpenseRoutes from "./expenses/billExpense.routes.js";
import choreBillRoutes from "./expenses/choreBill.routes.js";

const router = Router();
router.use(requireAuth);

router.use(roomRoutes);
router.use(inviteRoutes);
router.use(billExpenseRoutes);
router.use(choreBillRoutes);

export default router;
