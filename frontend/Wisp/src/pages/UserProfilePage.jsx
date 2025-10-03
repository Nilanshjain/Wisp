import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Calendar, UserPlus, MessageCircle, Clock } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import { useChatInviteStore } from "../store/useChatInviteStore";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";

const UserProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteStatus, setInviteStatus] = useState(null); // null, 'pending', 'accepted', 'none'

  const { sendChatInvite, sentInvites, pendingInvites } = useChatInviteStore();
  const { users, setSelectedUser } = useChatStore();
  const { authUser } = useAuthStore();

  useEffect(() => {
    fetchUserProfile();
    checkInviteStatus();
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/users/profile/${userId}`);
      setUser(res.data);
    } catch (error) {
      toast.error("Failed to load user profile");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const checkInviteStatus = () => {
    // Check if already connected (in sidebar)
    const isConnected = users.some(u => u._id === userId);
    if (isConnected) {
      setInviteStatus('accepted');
      return;
    }

    // Check if invite already sent
    const sentInvite = sentInvites.find(inv => inv.receiverId._id === userId);
    if (sentInvite) {
      setInviteStatus('pending');
      return;
    }

    // Check if received invite from this user
    const receivedInvite = pendingInvites.find(inv => inv.senderId._id === userId);
    if (receivedInvite) {
      setInviteStatus('received');
      return;
    }

    setInviteStatus('none');
  };

  const handleSendInvite = async () => {
    try {
      await sendChatInvite(userId);
      setInviteStatus('pending');
    } catch (error) {
      // Error handled in store
    }
  };

  const handleStartChat = () => {
    const userToChat = users.find(u => u._id === userId);
    if (userToChat) {
      setSelectedUser(userToChat);
      navigate("/");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-base-200">
      <div className="max-w-2xl mx-auto pt-20 px-4 pb-12">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="btn btn-ghost mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        {/* Profile Card */}
        <div className="bg-base-100 rounded-lg shadow-lg overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-primary to-secondary h-32"></div>

          {/* Profile Info */}
          <div className="px-6 pb-6">
            {/* Avatar */}
            <div className="flex justify-center -mt-16 mb-4">
              <div className="avatar">
                <div className="w-32 h-32 rounded-full ring-4 ring-base-100">
                  <img
                    src={user.profilePic || "/avatar.png"}
                    alt={user.fullName}
                  />
                </div>
              </div>
            </div>

            {/* Name and Username */}
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold mb-2">{user.fullName}</h1>
              <p className="text-base-content/60 text-lg">@{user.username}</p>
            </div>

            {/* User Details */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3 text-base-content/70">
                <Mail className="w-5 h-5" />
                <span>{user.email}</span>
              </div>

              <div className="flex items-center gap-3 text-base-content/70">
                <Calendar className="w-5 h-5" />
                <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
              </div>

              {user.lastSeen && (
                <div className="flex items-center gap-3 text-base-content/70">
                  <Clock className="w-5 h-5" />
                  <span>Last seen {new Date(user.lastSeen).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              {inviteStatus === 'none' && (
                <button
                  onClick={handleSendInvite}
                  className="btn btn-primary btn-lg w-full"
                >
                  <UserPlus className="w-5 h-5" />
                  Send Chat Invite
                </button>
              )}

              {inviteStatus === 'pending' && (
                <div className="alert">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span>Chat invite sent. Waiting for acceptance.</span>
                </div>
              )}

              {inviteStatus === 'received' && (
                <div className="alert alert-info">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span>This user sent you a chat invite! Check your sidebar to accept.</span>
                </div>
              )}

              {inviteStatus === 'accepted' && (
                <button
                  onClick={handleStartChat}
                  className="btn btn-primary btn-lg w-full"
                >
                  <MessageCircle className="w-5 h-5" />
                  Start Chat
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
