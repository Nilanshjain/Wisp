import { useState, useEffect } from "react";
import { X, Users, ImagePlus, Search } from "lucide-react";
import { useGroupStore } from "../store/useGroupStore";
import { useChatStore } from "../store/useChatStore";
import toast from "react-hot-toast";

const CreateGroupModal = ({ isOpen, onClose }) => {
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [groupImage, setGroupImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const { createGroup, addMembers } = useGroupStore();
  const { users, getUsers } = useChatStore();

  useEffect(() => {
    if (isOpen && users.length === 0) {
      getUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Filter users based on search query
  const filteredUsers = users.filter((user) =>
    user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setGroupImage(reader.result);
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const toggleParticipant = (userId) => {
    setSelectedParticipants((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!groupName.trim()) {
      toast.error("Group name is required");
      return;
    }

    if (groupName.length < 3 || groupName.length > 30) {
      toast.error("Group name must be 3-30 characters");
      return;
    }

    try {
      const groupData = {
        name: groupName.trim(),
        description: description.trim(),
        groupImage: groupImage || "",
        type: "private",
        maxMembers: 100,
      };

      const newGroup = await createGroup(groupData);

      // Add selected participants if any
      if (selectedParticipants.length > 0) {
        await addMembers(newGroup._id, selectedParticipants);
      }

      // Reset form
      setGroupName("");
      setDescription("");
      setGroupImage(null);
      setImagePreview(null);
      setSelectedParticipants([]);
      setSearchQuery("");

      onClose();
      toast.success("Group created successfully!");
    } catch (error) {
      console.error("Error creating group:", error);
    }
  };

  const handleClose = () => {
    setGroupName("");
    setDescription("");
    setGroupImage(null);
    setImagePreview(null);
    setSelectedParticipants([]);
    setSearchQuery("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="size-6" />
            Create New Group
          </h2>
          <button
            onClick={handleClose}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[calc(90vh-8rem)]">
          <div className="p-4 space-y-4 overflow-y-auto">
            {/* Group Image Upload */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Group preview"
                    className="size-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="size-24 rounded-full bg-base-300 flex items-center justify-center">
                    <Users className="size-10 text-base-content/40" />
                  </div>
                )}
                <label className="absolute bottom-0 right-0 btn btn-circle btn-sm btn-primary cursor-pointer">
                  <ImagePlus className="size-4" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
              </div>
              <p className="text-xs text-base-content/60">Upload group picture</p>
            </div>

            {/* Group Name */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Group Name *</span>
                <span className="label-text-alt">{groupName.length}/30</span>
              </label>
              <input
                type="text"
                placeholder="Enter group name"
                className="input input-bordered input-sm w-48"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                maxLength={30}
                required
              />
            </div>

            {/* Description */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Description</span>
                <span className="label-text-alt">{description.length}/100</span>
              </label>
              <textarea
                placeholder="Enter group description (optional)"
                className="textarea textarea-bordered textarea-sm h-14 w-56 resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={100}
              />
            </div>

            {/* Participants Section */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Add Participants</span>
                <span className="label-text-alt">
                  {selectedParticipants.length} selected
                </span>
              </label>

              {/* Search Bar */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-base-content/40" />
                <input
                  type="text"
                  placeholder="Search users..."
                  className="input input-bordered w-full pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Selected Participants Pills */}
              {selectedParticipants.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 p-3 bg-base-200 rounded-lg">
                  {selectedParticipants.map((userId) => {
                    const user = users.find((u) => u._id === userId);
                    return (
                      <div
                        key={userId}
                        className="badge badge-primary gap-2 py-3 px-3"
                      >
                        <img
                          src={user?.profilePic || "/avatar.png"}
                          alt={user?.fullName}
                          className="size-5 rounded-full"
                        />
                        <span>{user?.fullName}</span>
                        <button
                          type="button"
                          onClick={() => toggleParticipant(userId)}
                          className="btn btn-ghost btn-xs btn-circle"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* User List */}
              <div className="border border-base-300 rounded-lg max-h-60 overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-base-content/60">
                    No users found
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <label
                      key={user._id}
                      className="flex items-center gap-3 p-3 hover:bg-base-200 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        className="checkbox checkbox-primary"
                        checked={selectedParticipants.includes(user._id)}
                        onChange={() => toggleParticipant(user._id)}
                      />
                      <img
                        src={user.profilePic || "/avatar.png"}
                        alt={user.fullName}
                        className="size-10 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{user.fullName}</div>
                        <div className="text-sm text-base-content/60 truncate">
                          @{user.username}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-base-300 bg-base-200">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!groupName.trim()}
            >
              Create Group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;
