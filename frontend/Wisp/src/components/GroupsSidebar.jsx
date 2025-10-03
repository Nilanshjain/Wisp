import { useEffect, useState } from "react";
import { useGroupStore } from "../store/useGroupStore";
import { useChatStore } from "../store/useChatStore";
import { Users, Info } from "lucide-react";
import GroupDetailsModal from "./GroupDetailsModal";

const GroupsSidebar = () => {
  const { groups, getUserGroups, setSelectedGroup, selectedGroup, isGroupsLoading } = useGroupStore();
  const { setSelectedUser } = useChatStore();
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [selectedGroupForDetails, setSelectedGroupForDetails] = useState(null);

  useEffect(() => {
    getUserGroups();
  }, [getUserGroups]);

  const handleSelectGroup = (group) => {
    setSelectedUser(null); // Clear personal chat selection
    setSelectedGroup(group);
  };

  const handleGroupDetailsClick = (e, group) => {
    e.stopPropagation();
    setSelectedGroupForDetails(group);
    setShowGroupDetails(true);
  };

  if (isGroupsLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="size-5" />
          <span className="font-medium">Groups</span>
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <div className="skeleton size-12 rounded-full"></div>
              <div className="flex-1">
                <div className="skeleton h-4 w-24 mb-1"></div>
                <div className="skeleton h-3 w-32"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-base-300 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="size-5" />
        <span className="font-medium">Groups</span>
        <span className="text-xs text-base-content/60">({groups.length})</span>
      </div>

      <div className="space-y-1">
        {groups.length === 0 ? (
          <div className="text-center text-base-content/60 py-4 text-sm">
            No groups yet. Create one!
          </div>
        ) : (
          groups.map((group) => (
            <button
              key={group._id}
              onClick={() => handleSelectGroup(group)}
              className={`
                w-full p-3 flex items-center gap-3 rounded-lg
                hover:bg-base-200 transition-colors text-left
                ${selectedGroup?._id === group._id ? "bg-base-200 ring-1 ring-primary" : ""}
              `}
            >
              <div className="relative">
                {group.groupImage ? (
                  <img
                    src={group.groupImage}
                    alt={group.name}
                    className="size-12 object-cover rounded-full"
                  />
                ) : (
                  <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Users className="size-6 text-primary" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{group.name}</div>
                <div className="text-sm text-base-content/60 truncate">
                  {group.stats?.totalMembers || 0} members
                </div>
              </div>

              {/* Info Button */}
              <button
                onClick={(e) => handleGroupDetailsClick(e, group)}
                className="btn btn-ghost btn-xs btn-circle"
                title="Group Details"
              >
                <Info className="size-4" />
              </button>
            </button>
          ))
        )}
      </div>

      {/* Group Details Modal */}
      <GroupDetailsModal
        isOpen={showGroupDetails}
        onClose={() => {
          setShowGroupDetails(false);
          setSelectedGroupForDetails(null);
        }}
        group={selectedGroupForDetails}
      />
    </div>
  );
};

export default GroupsSidebar;
