import Group from '../models/group.model.js';
import GroupMember from '../models/groupMember.model.js';
import User from '../models/user.model.js';
import Message from '../models/message.model.js';

// Create a new group
export const createGroup = async (req, res) => {
    try {
        const { name, description, groupImage, type, maxMembers, settings } = req.body;
        const userId = req.user._id;

        // Create the group
        const group = await Group.create({
            name,
            description,
            groupImage: groupImage || '',
            createdBy: userId,
            type: type || 'private',
            maxMembers: maxMembers || 100,
            settings: settings || {},
        });

        // Add creator as owner
        await GroupMember.create({
            groupId: group._id,
            userId: userId,
            role: 'owner',
            status: 'active',
        });

        // Populate creator details
        const populatedGroup = await Group.findById(group._id).populate('createdBy', 'username email profilePic');

        res.status(201).json(populatedGroup);
    } catch (error) {
        console.error('Error in createGroup:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update group details
export const updateGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { name, description, groupImage, type, maxMembers, settings } = req.body;
        const userId = req.user._id;

        // Check if user is a member with edit permissions
        const membership = await GroupMember.findOne({
            groupId,
            userId,
            status: 'active',
        });

        if (!membership || !membership.permissions.canEditGroup) {
            return res.status(403).json({ error: 'You do not have permission to edit this group' });
        }

        // Update group
        const updatedGroup = await Group.findByIdAndUpdate(
            groupId,
            { name, description, groupImage, type, maxMembers, settings },
            { new: true, runValidators: true }
        ).populate('createdBy', 'username email profilePic');

        if (!updatedGroup) {
            return res.status(404).json({ error: 'Group not found' });
        }

        res.status(200).json(updatedGroup);
    } catch (error) {
        console.error('Error in updateGroup:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete group (owner only)
export const deleteGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        // Check if user is the owner
        const membership = await GroupMember.findOne({
            groupId,
            userId,
            role: 'owner',
            status: 'active',
        });

        if (!membership) {
            return res.status(403).json({ error: 'Only the group owner can delete the group' });
        }

        // Delete all group members
        await GroupMember.deleteMany({ groupId });

        // Delete all group messages
        await Message.deleteMany({ receiverId: groupId });

        // Delete the group
        await Group.findByIdAndDelete(groupId);

        res.status(200).json({ message: 'Group deleted successfully' });
    } catch (error) {
        console.error('Error in deleteGroup:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Add member to group
export const addMember = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { userIds } = req.body; // Array of user IDs to add
        const requestingUserId = req.user._id;

        // Get group
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        // Check if requesting user has permission to add members
        const membership = await GroupMember.findOne({
            groupId,
            userId: requestingUserId,
            status: 'active',
        });

        if (!membership || !membership.permissions.canAddMembers) {
            return res.status(403).json({ error: 'You do not have permission to add members' });
        }

        // Check if group is at max capacity
        const currentMemberCount = await GroupMember.countDocuments({
            groupId,
            status: { $in: ['active', 'pending'] },
        });

        if (currentMemberCount + userIds.length > group.maxMembers) {
            return res.status(400).json({ error: 'Group is at maximum capacity' });
        }

        // Validate all user IDs exist
        const users = await User.find({ _id: { $in: userIds } });
        if (users.length !== userIds.length) {
            return res.status(400).json({ error: 'One or more user IDs are invalid' });
        }

        // Add members
        const addedMembers = [];
        for (const userId of userIds) {
            // Check if user is already a member
            const existingMember = await GroupMember.findOne({ groupId, userId });

            if (existingMember) {
                if (existingMember.status === 'left' || existingMember.status === 'banned') {
                    // Reactivate member
                    existingMember.status = group.settings.requireApproval ? 'pending' : 'active';
                    existingMember.joinedAt = Date.now();
                    await existingMember.save();
                    addedMembers.push(existingMember);
                }
                // Skip if already active or pending
            } else {
                // Create new member
                const newMember = await GroupMember.create({
                    groupId,
                    userId,
                    role: 'member',
                    status: group.settings.requireApproval ? 'pending' : 'active',
                });
                addedMembers.push(newMember);
            }
        }

        // Update group stats
        const activeMemberCount = await GroupMember.countDocuments({
            groupId,
            status: 'active',
        });
        group.stats.totalMembers = activeMemberCount;
        await group.save();

        // Populate member details
        const populatedMembers = await GroupMember.find({
            _id: { $in: addedMembers.map(m => m._id) }
        }).populate('userId', 'username email profilePic');

        res.status(200).json(populatedMembers);
    } catch (error) {
        console.error('Error in addMember:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Remove member from group
export const removeMember = async (req, res) => {
    try {
        const { groupId, memberId } = req.params;
        const requestingUserId = req.user._id;

        // Check if requesting user has permission to remove members
        const requestingMembership = await GroupMember.findOne({
            groupId,
            userId: requestingUserId,
            status: 'active',
        });

        if (!requestingMembership || !requestingMembership.permissions.canRemoveMembers) {
            return res.status(403).json({ error: 'You do not have permission to remove members' });
        }

        // Get target member
        const targetMembership = await GroupMember.findOne({
            groupId,
            userId: memberId,
        });

        if (!targetMembership) {
            return res.status(404).json({ error: 'Member not found in this group' });
        }

        // Prevent removing owner
        if (targetMembership.role === 'owner') {
            return res.status(403).json({ error: 'Cannot remove the group owner' });
        }

        // Admins cannot remove other admins unless they are the owner
        if (targetMembership.role === 'admin' && requestingMembership.role !== 'owner') {
            return res.status(403).json({ error: 'Only the owner can remove admins' });
        }

        // Update member status to 'banned'
        targetMembership.status = 'left';
        await targetMembership.save();

        // Update group stats
        const group = await Group.findById(groupId);
        const activeMemberCount = await GroupMember.countDocuments({
            groupId,
            status: 'active',
        });
        group.stats.totalMembers = activeMemberCount;
        await group.save();

        res.status(200).json({ message: 'Member removed successfully' });
    } catch (error) {
        console.error('Error in removeMember:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update member role
export const updateMemberRole = async (req, res) => {
    try {
        const { groupId, memberId } = req.params;
        const { role } = req.body; // 'admin' or 'member'
        const requestingUserId = req.user._id;

        // Only owner can change roles
        const requestingMembership = await GroupMember.findOne({
            groupId,
            userId: requestingUserId,
            role: 'owner',
            status: 'active',
        });

        if (!requestingMembership) {
            return res.status(403).json({ error: 'Only the group owner can change member roles' });
        }

        // Get target member
        const targetMembership = await GroupMember.findOne({
            groupId,
            userId: memberId,
            status: 'active',
        });

        if (!targetMembership) {
            return res.status(404).json({ error: 'Member not found in this group' });
        }

        // Cannot change owner role
        if (targetMembership.role === 'owner') {
            return res.status(403).json({ error: 'Cannot change the owner role' });
        }

        // Validate role
        if (!['admin', 'member'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role. Must be "admin" or "member"' });
        }

        // Update role (pre-save middleware will set permissions)
        targetMembership.role = role;
        await targetMembership.save();

        const populatedMember = await GroupMember.findById(targetMembership._id)
            .populate('userId', 'username email profilePic');

        res.status(200).json(populatedMember);
    } catch (error) {
        console.error('Error in updateMemberRole:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get group details
export const getGroupDetails = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        // Check if user is a member
        const membership = await GroupMember.findOne({
            groupId,
            userId,
            status: { $in: ['active', 'pending'] },
        });

        if (!membership) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }

        const group = await Group.findById(groupId)
            .populate('createdBy', 'username email profilePic');

        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        res.status(200).json({
            group,
            membership,
        });
    } catch (error) {
        console.error('Error in getGroupDetails:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get group members
export const getGroupMembers = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        // Check if user is a member
        const membership = await GroupMember.findOne({
            groupId,
            userId,
            status: { $in: ['active', 'pending'] },
        });

        if (!membership) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }

        const members = await GroupMember.find({
            groupId,
            status: 'active',
        })
            .populate('userId', 'username email profilePic')
            .sort({ role: 1, joinedAt: 1 }); // Owner first, then admins, then members

        res.status(200).json(members);
    } catch (error) {
        console.error('Error in getGroupMembers:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Leave group
export const leaveGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        const membership = await GroupMember.findOne({
            groupId,
            userId,
            status: 'active',
        });

        if (!membership) {
            return res.status(404).json({ error: 'You are not a member of this group' });
        }

        // Owner cannot leave, must transfer ownership or delete group
        if (membership.role === 'owner') {
            return res.status(403).json({ error: 'Owner cannot leave the group. Transfer ownership or delete the group.' });
        }

        // Update status to left
        membership.status = 'left';
        await membership.save();

        // Update group stats
        const group = await Group.findById(groupId);
        const activeMemberCount = await GroupMember.countDocuments({
            groupId,
            status: 'active',
        });
        group.stats.totalMembers = activeMemberCount;
        await group.save();

        res.status(200).json({ message: 'Successfully left the group' });
    } catch (error) {
        console.error('Error in leaveGroup:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get user's groups
export const getUserGroups = async (req, res) => {
    try {
        const userId = req.user._id;

        const memberships = await GroupMember.find({
            userId,
            status: 'active',
        }).populate({
            path: 'groupId',
            populate: {
                path: 'createdBy',
                select: 'username profilePic',
            },
        });

        const groups = memberships.map(m => ({
            ...m.groupId.toObject(),
            memberRole: m.role,
            memberPermissions: m.permissions,
        }));

        res.status(200).json(groups);
    } catch (error) {
        console.error('Error in getUserGroups:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
