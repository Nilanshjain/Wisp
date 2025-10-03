import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { validate, userIdParamSchema } from "../middleware/validation.js";
import {
  sendChatInvite,
  acceptChatInvite,
  rejectChatInvite,
  getPendingInvites,
  getSentInvites,
  cancelChatInvite,
} from "../controllers/chatInvite.controllers.js";

const router = express.Router();

// Send a chat invite
router.post("/send/:id",
  protectRoute,
  validate(userIdParamSchema, 'params'),
  sendChatInvite
);

// Accept an invite
router.put("/accept/:id", protectRoute, acceptChatInvite);

// Reject an invite
router.put("/reject/:id", protectRoute, rejectChatInvite);

// Get pending invites (received)
router.get("/pending", protectRoute, getPendingInvites);

// Get sent invites
router.get("/sent", protectRoute, getSentInvites);

// Cancel a sent invite
router.delete("/cancel/:id", protectRoute, cancelChatInvite);

export default router;
