import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { useUserStore } from "../store/useUserStore";

const UserSearchBar = () => {
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  const timeoutRef = useRef(null);
  const navigate = useNavigate();

  const { searchResults, isSearching, searchUsers, clearSearch } = useUserStore();

  // Debounced search
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (query.trim().length >= 2) {
      timeoutRef.current = setTimeout(() => {
        searchUsers(query);
        setShowResults(true);
      }, 300);
    } else {
      clearSearch();
      setShowResults(false);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, searchUsers, clearSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectUser = (user) => {
    console.log("Navigating to user profile:", user._id);
    navigate(`/user/${user._id}`);
    setQuery("");
    setShowResults(false);
    clearSearch();
  };

  const handleClearSearch = () => {
    setQuery("");
    setShowResults(false);
    clearSearch();
  };

  return (
    <div className="relative w-full" ref={searchRef}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/40 w-4 h-4" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username, name or email..."
          className="input input-bordered w-full pl-10 pr-10 text-sm"
          onFocus={() => query.length >= 2 && setShowResults(true)}
        />
        {query && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-base-content/40 hover:text-base-content"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
          {isSearching ? (
            <div className="flex items-center justify-center py-8">
              <span className="loading loading-spinner loading-md"></span>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="py-2">
              {searchResults.map((user) => (
                <button
                  key={user._id}
                  onClick={() => handleSelectUser(user)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-base-200 transition-colors text-left"
                >
                  {/* Avatar */}
                  <div className="avatar">
                    <div className="w-10 h-10 rounded-full">
                      <img
                        src={user.profilePic || "/avatar.png"}
                        alt={user.fullName}
                      />
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {user.fullName}
                    </p>
                    <p className="text-xs text-base-content/60 truncate">
                      @{user.username}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : query.trim().length >= 2 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <Search className="w-12 h-12 text-base-content/20 mb-2" />
              <p className="text-sm text-base-content/60">No users found</p>
              <p className="text-xs text-base-content/40 mt-1">
                Try searching with a different username, name or email
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default UserSearchBar;
