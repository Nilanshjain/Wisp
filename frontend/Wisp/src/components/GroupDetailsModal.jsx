import { useState, useEffect } from "react";
import { X, Users, ImagePlus, Crown, Shield, UserMinus, UserPlus, Edit2, Trash2, LogOut, Search } from "lucide-react";
import { useGroupStore } from "../store/useGroupStore";
import { useChatStore } from "../store/useChatStore";
import toast from "react-hot-toast";

const GroupDetailsModal = ({ isOpen, onClose, group }) => {
  const [members, setMembers] = useState([]);
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [groupImage, setGroupImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);

  const {
    getGroupMembers,
    updateGroup,
    deleteGroup,
    removeMember,
    updateMemberRole,
    addMembers,
    leaveGroup,
  } = useGroupStore();

  const { users, getUsers } = useChatStore();

  useEffect(() => {
    if (isOpen && group) {
      loadGroupMembers();
      setGroupName(group.name || "");
      setDescription(group.description || "");
      setImagePreview(group.groupImage || null);
      getUsers();
    }
  }, [isOpen, group]);

  const loadGroupMembers = async () => {
    if (!group) return;
    try {
      const membersData = await getGroupMembers(group._id);
      setMembers(membersData);
    } catch (error) {
      console.error("Error loading members:", error);
    }
  };

  const currentUserMembership = members.find(
    (m) => m.userId?._id === group?.memberPermissions?.userId
  );

  const isOwner = group?.memberRole === "owner";
  const isAdmin = group?.memberRole === "admin" || isOwner;
  const canEditGroup = group?.memberPermissions?.canEditGroup;
  const canAddMembers = group?.memberPermissions?.canAddMembers;
  const canRemoveMembers = group?.memberPermissions?.canRemoveMembers;

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

  const handleUpdateGroup = async () => {
    try {
      await updateGroup(group._id, {
        name: groupName,
        description,
        groupImage: groupImage || group.groupImage,
      });
      setIsEditingGroup(false);
      toast.success("Group updated successfully");
    } catch (error) {
      console.error("Error updating group:", error);
    }
  };

  const handleDeleteGroup = async () => {
    if (!confirm("Are you sure you want to delete this group? This action cannot be undone.")) {
      return;
    }
    try {
      await deleteGroup(group._id);
      onClose();
      toast.success("Group deleted successfully");
    } catch (error) {
      console.error("Error deleting group:", error);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    try {
      await removeMember(group._id, memberId);
      await loadGroupMembers();
    } catch (error) {
      console.error("Error removing member:", error);
    }
  };

  const handleUpdateRole = async (memberId, newRole) => {
    try {
      await updateMemberRole(group._id, memberId, newRole);
      await loadGroupMembers();
    } catch (error) {
      console.error("Error updating role:", error);
    }
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Please select at least one user");
      return;
    }
    try {
      await addMembers(group._id, selectedUsers);
      setSelectedUsers([]);
      setShowAddMembers(false);
      setSearchQuery("");
      await loadGroupMembers();
      toast.success("Members added successfully");
    } catch (error) {
      console.error("Error adding members:", error);
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm("Are you sure you want to leave this group?")) return;
    try {
      await leaveGroup(group._id);
      onClose();
    } catch (error) {
      console.error("Error leaving group:", error);
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Filter users not already in the group
  const availableUsers = users.filter(
    (user) =>
      !members.some((m) => m.userId?._id === user._id) &&
      (user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!isOpen || !group) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="size-6" />
            Group Details
          </h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {/* Group Info */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt={group.name}
                  className="size-24 rounded-full object-cover"
                />
              ) : (
                <div className="size-24 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="size-12 text-primary" />
                </div>
              )}
              {isEditingGroup && canEditGroup && (
                <label className="absolute bottom-0 right-0 btn btn-circle btn-sm btn-primary cursor-pointer">
                  <ImagePlus className="size-4" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>

            {isEditingGroup ? (
              <div className="w-full space-y-3">
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group name"
                  maxLength={50}
                />
                <textarea
                  className="textarea textarea-bordered w-full"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description"
                  maxLength={500}
                />
                <div className="flex gap-2">
                  <button onClick={handleUpdateGroup} className="btn btn-primary btn-sm">
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingGroup(false);
                      setGroupName(group.name);
                      setDescription(group.description);
                      setImagePreview(group.groupImage);
                    }}
                    className="btn btn-ghost btn-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <h3 className="text-2xl font-bold">{group.name}</h3>
                  {group.description && (
                    <p className="text-base-content/60 mt-1">{group.description}</p>
                  )}
                  <p className="text-sm text-base-content/50 mt-2">
                    {members.length} members
                  </p>
                </div>
                {canEditGroup && (
                  <button
                    onClick={() => setIsEditingGroup(true)}
                    className="btn btn-sm btn-ghost gap-2"
                  >
                    <Edit2 className="size-4" />
                    Edit Group
                  </button>
                )}
              </>
            )}
          </div>

          {/* Members Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Members ({members.length})</h4>
              {canAddMembers && (
                <button
                  onClick={() => setShowAddMembers(!showAddMembers)}
                  className="btn btn-sm btn-primary gap-2"
                >
                  <UserPlus className="size-4" />
                  Add Members
                </button>
              )}
            </div>

            {/* Add Members Section */}
            {showAddMembers && (
              <div className="mb-4 p-4 bg-base-200 rounded-lg space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-base-content/40" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    className="input input-bordered w-full pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((userId) => {
                      const user = users.find((u) => u._id === userId);
                      return (
                        <div key={userId} className="badge badge-primary gap-2">
                          {user?.fullName}
                          <button
                            onClick={() => toggleUserSelection(userId)}
                            className="btn btn-ghost btn-xs btn-circle"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="max-h-40 overflow-y-auto border border-base-300 rounded-lg">
                  {availableUsers.length === 0 ? (
                    <div className="p-4 text-center text-base-content/60">No users found</div>
                  ) : (
                    availableUsers.map((user) => (
                      <label
                        key={user._id}
                        className="flex items-center gap-3 p-2 hover:bg-base-300 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm checkbox-primary"
                          checked={selectedUsers.includes(user._id)}
                          onChange={() => toggleUserSelection(user._id)}
                        />
                        <img
                          src={user.profilePic || "/avatar.png"}
                          alt={user.fullName}
                          className="size-8 rounded-full"
                        />
                        <span className="text-sm">{user.fullName}</span>
                      </label>
                    ))
                  )}
                </div>

                <button onClick={handleAddMembers} className="btn btn-primary btn-sm w-full">
                  Add Selected Users
                </button>
              </div>
            )}

            {/* Members List */}
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between p-3 bg-base-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={member.userId?.profilePic || "/avatar.png"}
                      alt={member.userId?.fullName}
                      className="size-10 rounded-full"
                    />
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {member.userId?.fullName}
                        {member.role === "owner" && (
                          <Crown className="size-4 text-yellow-500" title="Owner" />
                        )}
                        {member.role === "admin" && (
                          <Shield className="size-4 text-blue-500" title="Admin" />
                        )}
                      </div>
                      <div className="text-sm text-base-content/60">
                        @{member.userId?.username}
                      </div>
                    </div>
                  </div>

                  {/* Member Actions */}
                  {member.role !== "owner" && (isOwner || (isAdmin && member.role !== "admin")) && (
                    <div className="flex items-center gap-2">
                      {isOwner && member.role !== "admin" && (
                        <button
                          onClick={() => handleUpdateRole(member.userId._id, "admin")}
                          className="btn btn-xs btn-ghost"
                          title="Promote to Admin"
                        >
                          <Shield className="size-4" />
                        </button>
                      )}
                      {isOwner && member.role === "admin" && (
                        <button
                          onClick={() => handleUpdateRole(member.userId._id, "member")}
                          className="btn btn-xs btn-ghost"
                          title="Demote to Member"
                        >
                          <Shield className="size-4 text-base-content/40" />
                        </button>
                      )}
                      {canRemoveMembers && (
                        <button
                          onClick={() => handleRemoveMember(member.userId._id)}
                          className="btn btn-xs btn-ghost text-error"
                          title="Remove Member"
                        >
                          <UserMinus className="size-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="border-t border-base-300 pt-6 space-y-3">
            {!isOwner && (
              <button
                onClick={handleLeaveGroup}
                className="btn btn-outline btn-warning w-full gap-2"
              >
                <LogOut className="size-4" />
                Leave Group
              </button>
            )}
            {isOwner && (
              <button
                onClick={handleDeleteGroup}
                className="btn btn-outline btn-error w-full gap-2"
              >
                <Trash2 className="size-4" />
                Delete Group
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupDetailsModal;
