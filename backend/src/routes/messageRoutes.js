import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getMessages, getUsersForSidebar, sendMessage } from "../controllers/message.controllers.js";
import { messageLimiter } from "../middleware/rateLimiter.js";
import {
    validate,
    sendMessageSchema,
    userIdParamSchema,
    paginationSchema
} from "../middleware/validation.js";

const router = express.Router();

// Get all users for sidebar
router.get("/users", protectRoute, getUsersForSidebar);

// Get messages with pagination
router.get("/:id",
    protectRoute,
    validate(userIdParamSchema, 'params'),
    validate(paginationSchema, 'query'),
    getMessages
);

// Send message with validation and rate limiting
router.post("/send/:id",
    protectRoute,
    messageLimiter,
    validate(userIdParamSchema, 'params'),
    validate(sendMessageSchema),
    sendMessage
);

export default router;