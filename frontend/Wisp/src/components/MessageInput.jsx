import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Image, Send, X } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = ({ replyingTo, onCancelReply }) => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const { sendMessage, selectedUser } = useChatStore();
  const { authUser } = useAuthStore();

  const handleImageChange = (e) => {
    e.preventDefault();
    toast.error("Media uploads disabled for legal purposes");
    return;

    // Disabled code
    // const file = e.target.files[0];
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
    if (!text.trim() && !imagePreview) return;

    try {
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
        replyTo: replyingTo?._id,
      });

      // Clear form
      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onCancelReply?.();
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <div className="p-4 w-full">
      {/* Reply context */}
      {replyingTo && (
        <div className="mb-3 bg-base-200 rounded-lg p-3 border-l-4 border-primary">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-xs font-semibold text-primary mb-1">
                Replying to {replyingTo.senderId === authUser._id ? "yourself" : selectedUser.fullName}
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
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            className="w-full input input-bordered rounded-lg input-sm sm:input-md"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />

          <button
            type="button"
            className="hidden sm:flex btn btn-circle text-zinc-400 opacity-50 cursor-not-allowed"
            onClick={() => toast.error("Media uploads disabled for legal purposes")}
            title="Media uploads disabled"
          >
            <Image size={20} />
          </button>
        </div>
        <button
          type="submit"
          className="btn btn-sm btn-circle"
          disabled={!text.trim() && !imagePreview}
        >
          <Send size={22} />
        </button>
      </form>
    </div>
  );
};
export default MessageInput;