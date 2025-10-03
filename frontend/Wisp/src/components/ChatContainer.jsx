import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";
import { Reply } from "lucide-react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    markMessagesAsRead,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

  useEffect(() => {
    getMessages(selectedUser._id);

    subscribeToMessages();

    // Mark messages as read when viewing conversation
    markMessagesAsRead(selectedUser._id);

    return () => unsubscribeFromMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages, markMessagesAsRead]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Filter messages based on search query
  const filteredMessages = messages && Array.isArray(messages)
    ? messages.filter((msg) =>
        msg.text?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleReply = (message) => {
    setReplyingTo(message);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader
          onSearchChange={setSearchQuery}
          isSearchOpen={isSearchOpen}
          setIsSearchOpen={setIsSearchOpen}
        />
        <MessageSkeleton />
        <MessageInput replyingTo={replyingTo} onCancelReply={cancelReply} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader
        onSearchChange={setSearchQuery}
        isSearchOpen={isSearchOpen}
        setIsSearchOpen={setIsSearchOpen}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredMessages.map((message) => {
          // Debug logging
          if (message.replyTo) {
            console.log('Message with reply:', message);
          }

          return (
          <div
            key={message._id}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"} group`}
            ref={messageEndRef}
          >
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.senderId === authUser._id
                      ? authUser.profilePic || "/avatar.png"
                      : selectedUser.profilePic || "/avatar.png"
                  }
                  alt="profile pic"
                />
              </div>
            </div>
            <div className="chat-header mb-1">
              <time className="text-xs opacity-50 ml-1">
                {formatMessageTime(message.createdAt)}
              </time>
            </div>
            <div className="chat-bubble flex flex-col relative">
              {/* Reply context */}
              {message.replyTo && (
                <div className="bg-base-300/50 rounded px-2 py-1 mb-2 text-xs border-l-2 border-primary">
                  <div className="font-semibold opacity-70 flex items-center gap-1">
                    <Reply className="size-3" />
                    Replying to {message.replyTo.senderId?._id === authUser._id
                      ? "yourself"
                      : message.replyTo.senderId?.fullName || selectedUser.fullName}
                  </div>
                  <div className="opacity-60 truncate mt-0.5">
                    {message.replyTo.text || "📷 Image"}
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

              {/* Reply button - shows on hover */}
              <button
                onClick={() => handleReply(message)}
                className="absolute -top-2 -left-2 btn btn-xs btn-circle btn-ghost opacity-0 group-hover:opacity-100 transition-opacity"
                title="Reply"
              >
                <Reply className="size-3" />
              </button>
            </div>
            {/* Message Status (for sent messages only) */}
            {message.senderId === authUser._id && (
              <div className="chat-footer opacity-50 text-xs flex gap-1 items-center mt-1">
                {message.status === 'sent' && <span>✓</span>}
                {message.status === 'delivered' && <span>✓✓</span>}
                {message.status === 'read' && <span className="text-blue-500">✓✓</span>}
              </div>
            )}
          </div>
          );
        })}
      </div>

      <MessageInput replyingTo={replyingTo} onCancelReply={cancelReply} />
    </div>
  );
};
export default ChatContainer;