import { useGroupStore } from "../store/useGroupStore";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { Users, Send, Image as ImageIcon, X, Search, Reply } from "lucide-react";
import MessageSkeleton from "./skeletons/MessageSkeleton";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
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
    e.preventDefault();
    toast.error("Media uploads disabled for legal purposes");
    return;

    // Disabled code
    // const file = e.target.files[0];
    // if (!file) return;

    // if (!file.type.startsWith("image/")) {
    //   toast.error("Please select an image file");
    //   return;
    // }

    // const reader = new FileReader();
    // reader.onloadend = () => {
    //   setImagePreview(reader.result);
    // };
    // reader.readAsDataURL(file);
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
        replyTo: replyingTo?._id,
      });

      setText("");
      setImagePreview(null);
      setReplyingTo(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleReply = (message) => {
    setReplyingTo(message);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  // Filter messages based on search query
  const filteredMessages = groupMessages && Array.isArray(groupMessages)
    ? groupMessages.filter((msg) =>
        msg.text?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];


  if (!selectedGroup) return null;

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <GroupChatHeader
          group={selectedGroup}
          onSearchChange={setSearchQuery}
          isSearchOpen={isSearchOpen}
          setIsSearchOpen={setIsSearchOpen}
        />
        <MessageSkeleton />
        <GroupMessageInput
          text={text}
          setText={setText}
          imagePreview={imagePreview}
          handleImageChange={handleImageChange}
          removeImage={removeImage}
          handleSendMessage={handleSendMessage}
          fileInputRef={fileInputRef}
          replyingTo={replyingTo}
          onCancelReply={cancelReply}
          authUser={authUser}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <GroupChatHeader
        group={selectedGroup}
        onSearchChange={setSearchQuery}
        isSearchOpen={isSearchOpen}
        setIsSearchOpen={setIsSearchOpen}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredMessages.map((message) => (
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
              {/* Reply context */}
              {message.replyTo && (
                <div className="bg-base-300/50 rounded px-2 py-1 mb-2 text-xs border-l-2 border-primary">
                  <div className="font-semibold opacity-70">
                    {message.replyTo.senderId?._id === authUser._id
                      ? "You"
                      : message.replyTo.senderId?.fullName || message.replyTo.senderId?.username}
                  </div>
                  <div className="opacity-60 truncate">
                    {message.replyTo.text || "Image"}
                  </div>
                </div>
              )}

              {message.image && (
                <img
                  src={message.image}
                  alt="Attachment"
                  className="sm:max-w-[200px] rounded-md mb-2"
                />
              )}
              {message.text && <p>{message.text}</p>}

              {/* Reply button */}
              <button
                onClick={() => handleReply(message)}
                className="absolute -top-2 -left-2 btn btn-xs btn-circle btn-ghost opacity-0 group-hover:opacity-100 transition-opacity"
                title="Reply"
              >
                <Reply className="size-3" />
              </button>
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
        replyingTo={replyingTo}
        onCancelReply={cancelReply}
        authUser={authUser}
      />
    </div>
  );
};

// Group Chat Header Component
const GroupChatHeader = ({ group, onSearchChange, isSearchOpen, setIsSearchOpen }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearchChange?.(value);
  };

  const clearSearch = () => {
    setSearchQuery("");
    onSearchChange?.("");
    setIsSearchOpen?.(false);
  };

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
        <button
          onClick={() => setIsSearchOpen?.(!isSearchOpen)}
          className="btn btn-ghost btn-sm btn-circle"
          title="Search messages"
        >
          <Search className="size-5" />
        </button>
      </div>

      {/* Search Bar */}
      {isSearchOpen && (
        <div className="mt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-base-content/40" />
            <input
              type="text"
              placeholder="Search messages..."
              className="input input-bordered input-sm w-full pl-10 pr-10"
              value={searchQuery}
              onChange={handleSearchChange}
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-circle"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>
      )}
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
  replyingTo,
  onCancelReply,
  authUser,
}) => {
  return (
    <div className="border-t border-base-300 p-4">
      {/* Reply context */}
      {replyingTo && (
        <div className="mb-3 bg-base-200 rounded-lg p-3 border-l-4 border-primary">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-xs font-semibold text-primary mb-1">
                Replying to{" "}
                {replyingTo.senderId?._id === authUser._id
                  ? "yourself"
                  : replyingTo.senderId?.fullName || replyingTo.senderId?.username}
              </div>
              <div className="text-sm opacity-70 truncate">
                {replyingTo.text || "Image"}
              </div>
            </div>
            <button
              onClick={onCancelReply}
              className="btn btn-ghost btn-xs btn-circle"
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

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
          onClick={() => toast.error("Media uploads disabled for legal purposes")}
          className="btn btn-circle btn-ghost opacity-50 cursor-not-allowed"
          title="Media uploads disabled"
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
