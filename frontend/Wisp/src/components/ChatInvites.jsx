import { useEffect } from "react";
import { Check, X, UserPlus } from "lucide-react";
import { useChatInviteStore } from "../store/useChatInviteStore";
import { useChatStore } from "../store/useChatStore";

const ChatInvites = () => {
  const {
    pendingInvites,
    isLoading,
    getPendingInvites,
    acceptChatInvite,
    rejectChatInvite,
    subscribeToInvites,
    unsubscribeFromInvites,
  } = useChatInviteStore();

  const { getUsers } = useChatStore();

  useEffect(() => {
    getPendingInvites();
    subscribeToInvites();

    return () => {
      unsubscribeFromInvites();
    };
  }, [getPendingInvites, subscribeToInvites, unsubscribeFromInvites]);

  const handleAccept = async (inviteId) => {
    const success = await acceptChatInvite(inviteId);
    if (success) {
      // Refresh sidebar users to show new connection
      getUsers();
    }
  };

  const handleReject = async (inviteId) => {
    await rejectChatInvite(inviteId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <span className="loading loading-spinner loading-md"></span>
      </div>
    );
  }

  if (pendingInvites.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-base-300 p-3">
      <div className="flex items-center gap-2 mb-2">
        <UserPlus className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">
          Chat Invites ({pendingInvites.length})
        </span>
      </div>

      <div className="space-y-2">
        {pendingInvites.map((invite) => (
          <div
            key={invite._id}
            className="bg-base-200 rounded-lg p-2 flex items-center gap-2"
          >
            {/* Sender Avatar */}
            <div className="avatar">
              <div className="w-8 h-8 rounded-full">
                <img
                  src={invite.senderId.profilePic || "/avatar.png"}
                  alt={invite.senderId.fullName}
                />
              </div>
            </div>

            {/* Sender Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {invite.senderId.fullName}
              </p>
              <p className="text-xs text-base-content/60 truncate">
                @{invite.senderId.username}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-1">
              <button
                onClick={() => handleAccept(invite._id)}
                className="btn btn-xs btn-success"
                title="Accept"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleReject(invite._id)}
                className="btn btn-xs btn-error"
                title="Reject"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatInvites;
