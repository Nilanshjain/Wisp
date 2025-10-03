import { create } from 'zustand';
import toast from 'react-hot-toast';
import { axiosInstance } from '../lib/axios';
import { useAuthStore } from './useAuthStore';

export const useGroupStore = create((set, get) => ({
    groups: [],
    selectedGroup: null,
    groupMessages: [],
    isGroupsLoading: false,
    isMessagesLoading: false,

    // Fetch user's groups
    getUserGroups: async () => {
        set({ isGroupsLoading: true });
        try {
            const res = await axiosInstance.get('/groups/user/groups');
            set({ groups: res.data });
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to fetch groups');
        } finally {
            set({ isGroupsLoading: false });
        }
    },

    // Create a new group
    createGroup: async (groupData) => {
        try {
            const res = await axiosInstance.post('/groups', groupData);
            set((state) => ({ groups: [...state.groups, res.data] }));
            toast.success('Group created successfully');
            return res.data;
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to create group');
            throw error;
        }
    },

    // Update group details
    updateGroup: async (groupId, groupData) => {
        try {
            const res = await axiosInstance.put(`/groups/${groupId}`, groupData);
            set((state) => ({
                groups: state.groups.map((g) =>
                    g._id === groupId ? res.data : g
                ),
                selectedGroup:
                    state.selectedGroup?._id === groupId ? res.data : state.selectedGroup,
            }));
            toast.success('Group updated successfully');
            return res.data;
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to update group');
            throw error;
        }
    },

    // Delete group
    deleteGroup: async (groupId) => {
        try {
            await axiosInstance.delete(`/groups/${groupId}`);
            set((state) => ({
                groups: state.groups.filter((g) => g._id !== groupId),
                selectedGroup:
                    state.selectedGroup?._id === groupId ? null : state.selectedGroup,
            }));
            toast.success('Group deleted successfully');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to delete group');
            throw error;
        }
    },

    // Get group details
    getGroupDetails: async (groupId) => {
        try {
            const res = await axiosInstance.get(`/groups/${groupId}`);
            return res.data;
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to fetch group details');
            throw error;
        }
    },

    // Get group members
    getGroupMembers: async (groupId) => {
        try {
            const res = await axiosInstance.get(`/groups/${groupId}/members`);
            return res.data;
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to fetch group members');
            throw error;
        }
    },

    // Add members to group
    addMembers: async (groupId, userIds) => {
        try {
            const res = await axiosInstance.post(`/groups/${groupId}/members`, { userIds });
            toast.success('Members added successfully');
            return res.data;
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to add members');
            throw error;
        }
    },

    // Remove member from group
    removeMember: async (groupId, memberId) => {
        try {
            await axiosInstance.delete(`/groups/${groupId}/members/${memberId}`);
            toast.success('Member removed successfully');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to remove member');
            throw error;
        }
    },

    // Update member role
    updateMemberRole: async (groupId, memberId, role) => {
        try {
            const res = await axiosInstance.put(
                `/groups/${groupId}/members/${memberId}/role`,
                { role }
            );
            toast.success('Member role updated successfully');
            return res.data;
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to update member role');
            throw error;
        }
    },

    // Leave group
    leaveGroup: async (groupId) => {
        try {
            await axiosInstance.post(`/groups/${groupId}/leave`);
            set((state) => ({
                groups: state.groups.filter((g) => g._id !== groupId),
                selectedGroup:
                    state.selectedGroup?._id === groupId ? null : state.selectedGroup,
            }));
            toast.success('Left group successfully');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to leave group');
            throw error;
        }
    },

    // Set selected group
    setSelectedGroup: async (group) => {
        set({ selectedGroup: group });
        if (group) {
            await get().getGroupMessages(group._id);
        }
    },

    // Get group messages
    getGroupMessages: async (groupId) => {
        set({ isMessagesLoading: true });
        try {
            const res = await axiosInstance.get(`/groups/${groupId}/messages`);
            set({ groupMessages: res.data.messages });
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to fetch messages');
        } finally {
            set({ isMessagesLoading: false });
        }
    },

    // Send group message
    sendGroupMessage: async (groupId, messageData) => {
        const { selectedGroup, groupMessages } = get();
        try {
            const res = await axiosInstance.post(
                `/groups/${groupId}/messages`,
                messageData
            );

            // Only update if this is the currently selected group
            if (selectedGroup?._id === groupId) {
                set({ groupMessages: [...groupMessages, res.data] });
            }

            return res.data;
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to send message');
            throw error;
        }
    },

    // Delete group message
    deleteGroupMessage: async (groupId, messageId) => {
        try {
            await axiosInstance.delete(`/groups/${groupId}/messages/${messageId}`);
            set((state) => ({
                groupMessages: state.groupMessages.filter((m) => m._id !== messageId),
            }));
            toast.success('Message deleted');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to delete message');
            throw error;
        }
    },

    // Mark group messages as read
    markGroupMessagesAsRead: async (groupId) => {
        try {
            await axiosInstance.put(`/groups/${groupId}/messages/read`);
        } catch (error) {
            console.error('Failed to mark messages as read:', error);
        }
    },

    // Subscribe to group messages via Socket.IO
    subscribeToGroupMessages: () => {
        const { socket } = useAuthStore.getState();
        if (!socket) return;

        socket.on('newGroupMessage', ({ message, groupId }) => {
            const { selectedGroup, groupMessages } = get();

            // Add message if it's for the currently selected group
            if (selectedGroup?._id === groupId) {
                set({ groupMessages: [...groupMessages, message] });
            }

            // Update group's last message in groups list
            set((state) => ({
                groups: state.groups.map((g) =>
                    g._id === groupId
                        ? { ...g, lastMessage: message }
                        : g
                ),
            }));
        });

        socket.on('groupMessageDeleted', ({ messageId, groupId }) => {
            const { selectedGroup } = get();

            // Remove message if it's for the currently selected group
            if (selectedGroup?._id === groupId) {
                set((state) => ({
                    groupMessages: state.groupMessages.filter(
                        (m) => m._id !== messageId
                    ),
                }));
            }
        });

        socket.on('groupJoined', ({ groupId }) => {
            // Refresh groups list when user joins a new group
            get().getUserGroups();
        });
    },

    // Unsubscribe from group messages
    unsubscribeFromGroupMessages: () => {
        const { socket } = useAuthStore.getState();
        if (!socket) return;

        socket.off('newGroupMessage');
        socket.off('groupMessageDeleted');
        socket.off('groupJoined');
    },

    // Join a group room via Socket.IO
    joinGroupRoom: (groupId) => {
        const { socket } = useAuthStore.getState();
        if (!socket) return;

        socket.emit('joinGroup', { groupId });
    },

    // Leave a group room via Socket.IO
    leaveGroupRoom: (groupId) => {
        const { socket } = useAuthStore.getState();
        if (!socket) return;

        socket.emit('leaveGroup', { groupId });
    },
}));
