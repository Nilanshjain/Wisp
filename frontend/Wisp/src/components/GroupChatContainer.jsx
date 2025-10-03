import { useGroupStore } from "../store/useGroupStore";
import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { Users, Send, Image as ImageIcon, X } from "lucide-react";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useState } from "react";
import toast from "react-hot-toast";

const GroupChatContainer = () => {
  const {
    groupMessages,
    getGroupMessages,
    sendGroupMessage,
    deleteGroupMessage,
    markGroupMessagesAsRead,
    selectedGroup,
    isMessagesLoading,
    subscribeToGroupMessages,
    unsubscribeFromGroupMessages,
    joinGroupRoom,
    leaveGroupRoom,
  } = useGroupStore();

  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (selectedGroup) {
      getGroupMessages(selectedGroup._id);
      joinGroupRoom(selectedGroup._id);
      subscribeToGroupMessages();
      markGroupMessagesAsRead(selectedGroup._id);

      return () => {
        leaveGroupRoom(selectedGroup._id);
        unsubscribeFromGroupMessages();
      };
    }
  }, [
    selectedGroup,
    getGroupMessages,
    joinGroupRoom,
    subscribeToGroupMessages,
    markGroupMessagesAsRead,
    leaveGroupRoom,
    unsubscribeFromGroupMessages,
  ]);

  useEffect(() => {
    if (messageEndRef.current && groupMessages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [groupMessages]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!text.trim() && !imagePreview) {
      return;
    }

    try {
      await sendGroupMessage(selectedGroup._id, {
        text: text.trim(),
        image: imagePreview,
      });

      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    try {
      await deleteGroupMessage(selectedGroup._id, messageId);
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const canDeleteMessage = (message) => {
    // User can delete their own messages or if they're admin/owner
    return (
      message.senderId?._id === authUser._id ||
      selectedGroup?.memberRole === "owner" ||
      selectedGroup?.memberRole === "admin"
    );
  };

  if (!selectedGroup) return null;

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <GroupChatHeader group={selectedGroup} />
        <MessageSkeleton />
        <GroupMessageInput
          text={text}
          setText={setText}
          imagePreview={imagePreview}
          handleImageChange={handleImageChange}
          removeImage={removeImage}
          handleSendMessage={handleSendMessage}
          fileInputRef={fileInputRef}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <GroupChatHeader group={selectedGroup} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {groupMessages && Array.isArray(groupMessages) && groupMessages.map((message) => (
          <div
            key={message._id}
            className={`chat ${message.senderId?._id === authUser._id ? "chat-end" : "chat-start"}`}
            ref={messageEndRef}
          >
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={message.senderId?.profilePic || "/avatar.png"}
                  alt={message.senderId?.username || "User"}
                />
              </div>
            </div>
            <div className="chat-header mb-1">
              <span className="font-medium text-sm mr-2">
                {message.senderId?._id === authUser._id
                  ? "You"
                  : message.senderId?.fullName || message.senderId?.username}
              </span>
              <time className="text-xs opacity-50">
                {formatMessageTime(message.createdAt)}
              </time>
            </div>
            <div className="chat-bubble flex flex-col relative group">
              {message.image && (
                <img
                  src={message.image}
                  alt="Attachment"
                  className="sm:max-w-[200px] rounded-md mb-2"
                />
              )}
              {message.text && <p>{message.text}</p>}

              {/* Delete button */}
              {canDeleteMessage(message) && (
                <button
                  onClick={() => handleDeleteMessage(message._id)}
                  className="absolute -top-2 -right-2 btn btn-xs btn-circle btn-error opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete message"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <GroupMessageInput
        text={text}
        setText={setText}
        imagePreview={imagePreview}
        handleImageChange={handleImageChange}
        removeImage={removeImage}
        handleSendMessage={handleSendMessage}
        fileInputRef={fileInputRef}
      />
    </div>
  );
};

// Group Chat Header Component
const GroupChatHeader = ({ group }) => {
  return (
    <div className="border-b border-base-300 p-4">
      <div className="flex items-center gap-3">
        {group.groupImage ? (
          <img
            src={group.groupImage}
            alt={group.name}
            className="size-12 rounded-full object-cover"
          />
        ) : (
          <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Users className="size-6 text-primary" />
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{group.name}</h3>
          <p className="text-sm text-base-content/60">
            {group.stats?.totalMembers || 0} members
          </p>
        </div>
      </div>
    </div>
  );
};

// Group Message Input Component
const GroupMessageInput = ({
  text,
  setText,
  imagePreview,
  handleImageChange,
  removeImage,
  handleSendMessage,
  fileInputRef,
}) => {
  return (
    <div className="border-t border-base-300 p-4">
      {imagePreview && (
        <div className="mb-3 relative inline-block">
          <img
            src={imagePreview}
            alt="Preview"
            className="max-h-32 rounded-lg"
          />
          <button
            onClick={removeImage}
            className="absolute -top-2 -right-2 btn btn-circle btn-sm btn-error"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleImageChange}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="btn btn-circle btn-ghost"
        >
          <ImageIcon className="size-5" />
        </button>

        <input
          type="text"
          className="input input-bordered flex-1"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <button
          type="submit"
          className="btn btn-primary btn-circle"
          disabled={!text.trim() && !imagePreview}
        >
          <Send className="size-5" />
        </button>
      </form>
    </div>
  );
};

export default GroupChatContainer;
