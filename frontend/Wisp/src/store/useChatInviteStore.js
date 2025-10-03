import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatInviteStore = create((set, get) => ({
  pendingInvites: [],
  sentInvites: [],
  isLoading: false,

  // Send a chat invite
  sendChatInvite: async (userId) => {
    try {
      const res = await axiosInstance.post(`/invites/send/${userId}`);
      toast.success("Chat invite sent!");
      get().getSentInvites(); // Refresh sent invites
      return res.data;
    } catch (error) {
      const message = error.response?.data?.error || "Failed to send invite";
      toast.error(message);
      throw error;
    }
  },

  // Accept a chat invite
  acceptChatInvite: async (inviteId) => {
    try {
      await axiosInstance.put(`/invites/accept/${inviteId}`);
      toast.success("Chat invite accepted!");

      // Remove from pending invites
      set((state) => ({
        pendingInvites: state.pendingInvites.filter((inv) => inv._id !== inviteId),
      }));

      return true;
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to accept invite");
      return false;
    }
  },

  // Reject a chat invite
  rejectChatInvite: async (inviteId) => {
    try {
      await axiosInstance.put(`/invites/reject/${inviteId}`);
      toast.success("Chat invite rejected");

      // Remove from pending invites
      set((state) => ({
        pendingInvites: state.pendingInvites.filter((inv) => inv._id !== inviteId),
      }));

      return true;
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to reject invite");
      return false;
    }
  },

  // Cancel a sent invite
  cancelChatInvite: async (inviteId) => {
    try {
      await axiosInstance.delete(`/invites/cancel/${inviteId}`);
      toast.success("Chat invite cancelled");

      // Remove from sent invites
      set((state) => ({
        sentInvites: state.sentInvites.filter((inv) => inv._id !== inviteId),
      }));

      return true;
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to cancel invite");
      return false;
    }
  },

  // Get pending invites (received)
  getPendingInvites: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/invites/pending");
      set({ pendingInvites: res.data });
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to fetch invites");
    } finally {
      set({ isLoading: false });
    }
  },

  // Get sent invites
  getSentInvites: async () => {
    try {
      const res = await axiosInstance.get("/invites/sent");
      set({ sentInvites: res.data });
    } catch (error) {
      console.error("Failed to fetch sent invites:", error);
    }
  },

  // Subscribe to Socket.IO events for real-time invite updates
  subscribeToInvites: () => {
    const { socket } = useAuthStore.getState();
    if (!socket) return;

    socket.on("newChatInvite", (invite) => {
      set((state) => ({
        pendingInvites: [invite, ...state.pendingInvites],
      }));
      toast.success(`New chat invite from ${invite.sender.fullName}`);
    });

    socket.on("chatInviteAccepted", (data) => {
      set((state) => ({
        sentInvites: state.sentInvites.filter((inv) => inv._id !== data.inviteId),
      }));
      toast.success(`${data.acceptedBy.fullName} accepted your chat invite!`);
    });

    socket.on("chatInviteRejected", (data) => {
      set((state) => ({
        sentInvites: state.sentInvites.filter((inv) => inv._id !== data.inviteId),
      }));
    });

    socket.on("chatInviteCancelled", (data) => {
      set((state) => ({
        pendingInvites: state.pendingInvites.filter((inv) => inv._id !== data.inviteId),
      }));
    });
  },

  unsubscribeFromInvites: () => {
    const { socket } = useAuthStore.getState();
    if (!socket) return;

    socket.off("newChatInvite");
    socket.off("chatInviteAccepted");
    socket.off("chatInviteRejected");
    socket.off("chatInviteCancelled");
  },
}));
