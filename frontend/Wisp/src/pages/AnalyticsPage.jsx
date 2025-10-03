import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import {
  Users,
  MessageSquare,
  UsersRound,
  Activity,
  TrendingUp,
  Shield,
  Database,
  Cpu,
} from "lucide-react";

const AnalyticsPage = () => {
  const { authUser } = useAuthStore();
  const [platformStats, setPlatformStats] = useState(null);
  const [groupStats, setGroupStats] = useState(null);
  const [topUsers, setTopUsers] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [authProviders, setAuthProviders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is admin
  if (authUser?.role !== "admin") {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="size-16 mx-auto text-error mb-4" />
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-base-content/60 mt-2">
            You need admin privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const [statsRes, groupsRes, usersRes, healthRes, providersRes] =
        await Promise.all([
          axiosInstance.get("/analytics/stats"),
          axiosInstance.get("/analytics/group-stats"),
          axiosInstance.get("/analytics/top-users?limit=5"),
          axiosInstance.get("/analytics/system-health"),
          axiosInstance.get("/analytics/auth-providers"),
        ]);

      setPlatformStats(statsRes.data);
      setGroupStats(groupsRes.data);
      setTopUsers(usersRes.data);
      setSystemHealth(healthRes.data);
      setAuthProviders(providersRes.data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Activity className="size-8" />
            Analytics Dashboard
          </h1>
          <p className="text-base-content/60 mt-2">
            Monitor platform performance and user activity
          </p>
        </div>

        {/* Platform Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<Users className="size-6" />}
            title="Total Users"
            value={platformStats?.totalUsers || 0}
            subtitle={`${platformStats?.activeUsers || 0} active`}
            color="text-primary"
          />
          <StatCard
            icon={<MessageSquare className="size-6" />}
            title="Total Messages"
            value={platformStats?.totalMessages || 0}
            subtitle={`${platformStats?.messagesToday || 0} today`}
            color="text-secondary"
          />
          <StatCard
            icon={<UsersRound className="size-6" />}
            title="Total Groups"
            value={platformStats?.totalGroups || 0}
            subtitle={`Avg ${groupStats?.avgGroupSize?.toFixed(1) || 0} members`}
            color="text-accent"
          />
          <StatCard
            icon={<TrendingUp className="size-6" />}
            title="New Users"
            value={platformStats?.newUsersThisWeek || 0}
            subtitle="This week"
            color="text-success"
          />
        </div>

        {/* Charts and Tables Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Users */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">
                <Users className="size-5" />
                Top Active Users
              </h2>
              <div className="space-y-3 mt-4">
                {topUsers.length === 0 ? (
                  <p className="text-center text-base-content/60 py-4">
                    No data available
                  </p>
                ) : (
                  topUsers.map((user, index) => (
                    <div
                      key={user._id}
                      className="flex items-center justify-between p-3 bg-base-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center font-bold">
                          #{index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{user.fullName}</div>
                          <div className="text-sm text-base-content/60">
                            @{user.username}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-primary">
                          {user.messageCount}
                        </div>
                        <div className="text-xs text-base-content/60">
                          messages
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Auth Providers */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">
                <Shield className="size-5" />
                Authentication Methods
              </h2>
              <div className="space-y-3 mt-4">
                {authProviders.length === 0 ? (
                  <p className="text-center text-base-content/60 py-4">
                    No data available
                  </p>
                ) : (
                  authProviders.map((provider) => {
                    const total = authProviders.reduce(
                      (sum, p) => sum + p.count,
                      0
                    );
                    const percentage = ((provider.count / total) * 100).toFixed(
                      1
                    );

                    return (
                      <div key={provider._id} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium capitalize">
                            {provider._id || "Local"}
                          </span>
                          <span className="text-sm text-base-content/60">
                            {provider.count} ({percentage}%)
                          </span>
                        </div>
                        <progress
                          className="progress progress-primary w-full"
                          value={percentage}
                          max="100"
                        ></progress>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Top Groups */}
        {groupStats?.topGroups && groupStats.topGroups.length > 0 && (
          <div className="card bg-base-100 shadow-xl mb-8">
            <div className="card-body">
              <h2 className="card-title">
                <UsersRound className="size-5" />
                Most Active Groups
              </h2>
              <div className="overflow-x-auto mt-4">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Group Name</th>
                      <th>Creator</th>
                      <th>Members</th>
                      <th>Messages</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupStats.topGroups.map((group, index) => (
                      <tr key={group._id}>
                        <td>
                          <div className="badge badge-neutral">#{index + 1}</div>
                        </td>
                        <td className="font-medium">{group.name}</td>
                        <td>@{group.createdBy?.username || "Unknown"}</td>
                        <td>
                          <div className="badge badge-ghost">
                            {group.stats?.totalMembers || 0}
                          </div>
                        </td>
                        <td className="font-semibold text-primary">
                          {group.stats?.totalMessages || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* System Health */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <Cpu className="size-5" />
              System Health
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-figure text-primary">
                  <Activity className="size-8" />
                </div>
                <div className="stat-title">Uptime</div>
                <div className="stat-value text-2xl">
                  {formatUptime(systemHealth?.uptime || 0)}
                </div>
                <div className="stat-desc">
                  Node {systemHealth?.nodeVersion}
                </div>
              </div>

              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-figure text-secondary">
                  <Database className="size-8" />
                </div>
                <div className="stat-title">Memory Usage</div>
                <div className="stat-value text-2xl">
                  {systemHealth?.memory?.heapUsed || 0} MB
                </div>
                <div className="stat-desc">
                  of {systemHealth?.memory?.heapTotal || 0} MB total
                </div>
              </div>

              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-figure text-accent">
                  <Database className="size-8" />
                </div>
                <div className="stat-title">Database Size</div>
                <div className="stat-value text-2xl">
                  {systemHealth?.database?.dataSize || 0} MB
                </div>
                <div className="stat-desc">
                  Storage: {systemHealth?.database?.storageSize || 0} MB
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ icon, title, value, subtitle, color }) => {
  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <div className={`${color}`}>{icon}</div>
        </div>
        <div className="mt-4">
          <h3 className="text-sm text-base-content/60">{title}</h3>
          <p className="text-3xl font-bold mt-1">{value.toLocaleString()}</p>
          {subtitle && (
            <p className="text-sm text-base-content/60 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function to format uptime
const formatUptime = (seconds) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

export default AnalyticsPage;
