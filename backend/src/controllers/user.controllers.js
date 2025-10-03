import User from "../models/user.model.js";
import Message from "../models/message.model.js";

/**
 * Search users by name or email
 * GET /api/users/search?q=query&limit=20&cursor=id
 */
export const searchUsers = async (req, res) => {
  try {
    const { q, limit = 20, cursor } = req.query;
    const loggedInUserId = req.user._id;

    console.log(`🔍 Search request: query="${q}", user=${loggedInUserId}`);

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        error: "Search query must be at least 2 characters"
      });
    }

    // Build query
    const query = {
      $text: { $search: q },
      _id: { $ne: loggedInUserId }, // Exclude current user
    };

    // Add cursor for pagination
    if (cursor) {
      query._id = {
        ...query._id,
        $lt: cursor
      };
    }

    // Execute search with limit + 1 to check for more results
    const users = await User.find(query)
      .select("fullName email username profilePic createdAt")
      .sort({ score: { $meta: "textScore" }, _id: -1 })
      .limit(parseInt(limit) + 1);

    console.log(`✅ Search results: found ${users.length} users`);

    // Check if there are more results
    const hasMore = users.length > limit;
    const returnedUsers = hasMore ? users.slice(0, limit) : users;
    const nextCursor = hasMore ? returnedUsers[returnedUsers.length - 1]._id : null;

    res.status(200).json({
      users: returnedUsers,
      pagination: {
        hasMore,
        nextCursor,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("❌ Error in searchUsers:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Get recent conversations (users you've messaged)
 * GET /api/users/recent
 */
export const getRecentChats = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    // Aggregate to find unique users from messages
    const recentUsers = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: loggedInUserId },
            { receiverId: loggedInUserId }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$senderId", loggedInUserId] },
              "$receiverId",
              "$senderId"
            ]
          },
          lastMessage: { $first: "$$ROOT" }
        }
      },
      {
        $limit: 50
      }
    ]);

    // Get user details for each conversation
    const userIds = recentUsers.map(u => u._id);
    const users = await User.find({ _id: { $in: userIds } })
      .select("fullName email username profilePic lastSeen");

    // Combine user data with last message info
    const usersWithLastMessage = users.map(user => {
      const conversation = recentUsers.find(
        c => c._id.toString() === user._id.toString()
      );
      return {
        ...user.toObject(),
        lastMessage: {
          text: conversation.lastMessage.text,
          createdAt: conversation.lastMessage.createdAt,
          senderId: conversation.lastMessage.senderId
        }
      };
    });

    // Sort by last message time
    usersWithLastMessage.sort((a, b) =>
      new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
    );

    res.status(200).json(usersWithLastMessage);
  } catch (error) {
    console.error("Error in getRecentChats:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Get suggested users (recently joined)
 * GET /api/users/suggested?limit=10
 */
export const getSuggestedUsers = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const loggedInUserId = req.user._id;

    // Get recently joined users (excluding current user)
    const suggestedUsers = await User.find({
      _id: { $ne: loggedInUserId }
    })
      .select("fullName email username profilePic createdAt")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json(suggestedUsers);
  } catch (error) {
    console.error("Error in getSuggestedUsers:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Get user profile by ID
 * GET /api/users/profile/:userId
 */
export const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const loggedInUserId = req.user._id;

    // Can't view your own profile through this endpoint
    if (userId === loggedInUserId.toString()) {
      return res.status(400).json({ error: "Use /api/auth/check for your own profile" });
    }

    const user = await User.findById(userId)
      .select("fullName email username profilePic createdAt lastSeen");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error in getUserProfile:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
