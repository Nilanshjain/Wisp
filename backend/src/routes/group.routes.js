import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import {
    createGroup,
    updateGroup,
    deleteGroup,
    addMember,
    removeMember,
    updateMemberRole,
    getGroupDetails,
    getGroupMembers,
    leaveGroup,
    getUserGroups,
} from '../controllers/group.controllers.js';
import {
    sendGroupMessage,
    getGroupMessages,
    deleteGroupMessage,
    markGroupMessagesAsRead,
    getUnreadGroupMessageCount,
} from '../controllers/groupMessage.controllers.js';

const router = express.Router();

// Group management routes
router.post('/', protectRoute, createGroup);
router.put('/:groupId', protectRoute, updateGroup);
router.delete('/:groupId', protectRoute, deleteGroup);
router.get('/user/groups', protectRoute, getUserGroups);
router.get('/:groupId', protectRoute, getGroupDetails);

// Member management routes
router.get('/:groupId/members', protectRoute, getGroupMembers);
router.post('/:groupId/members', protectRoute, addMember);
router.delete('/:groupId/members/:memberId', protectRoute, removeMember);
router.put('/:groupId/members/:memberId/role', protectRoute, updateMemberRole);
router.post('/:groupId/leave', protectRoute, leaveGroup);

// Group message routes
router.post('/:groupId/messages', protectRoute, sendGroupMessage);
router.get('/:groupId/messages', protectRoute, getGroupMessages);
router.delete('/:groupId/messages/:messageId', protectRoute, deleteGroupMessage);
router.put('/:groupId/messages/read', protectRoute, markGroupMessagesAsRead);
router.get('/:groupId/messages/unread', protectRoute, getUnreadGroupMessageCount);

export default router;
