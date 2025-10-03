import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

export const useUserStore = create((set, get) => ({
  searchResults: [],
  recentChats: [],
  suggestedUsers: [],
  isSearching: false,
  isLoadingRecent: false,
  isLoadingSuggested: false,

  // Search users by name or email
  searchUsers: async (query) => {
    if (!query || query.trim().length < 2) {
      set({ searchResults: [] });
      return;
    }

    set({ isSearching: true });
    try {
      const res = await axiosInstance.get(`/users/search?q=${encodeURIComponent(query)}&limit=20`);
      set({ searchResults: res.data.users });
    } catch (error) {
      console.error("Search error:", error);
      toast.error(error.response?.data?.error || "Failed to search users");
      set({ searchResults: [] });
    } finally {
      set({ isSearching: false });
    }
  },

  // Get recent conversations
  getRecentChats: async () => {
    set({ isLoadingRecent: true });
    try {
      const res = await axiosInstance.get("/users/recent");
      set({ recentChats: res.data });
    } catch (error) {
      console.error("Recent chats error:", error);
      toast.error("Failed to load recent chats");
    } finally {
      set({ isLoadingRecent: false });
    }
  },

  // Get suggested users
  getSuggestedUsers: async () => {
    set({ isLoadingSuggested: true });
    try {
      const res = await axiosInstance.get("/users/suggested?limit=10");
      set({ suggestedUsers: res.data });
    } catch (error) {
      console.error("Suggested users error:", error);
      toast.error("Failed to load suggested users");
    } finally {
      set({ isLoadingSuggested: false });
    }
  },

  // Clear search results
  clearSearch: () => set({ searchResults: [] }),
}));
