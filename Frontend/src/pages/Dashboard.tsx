import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getProjects } from "../api/projects";
import { getTasks, updateTaskStatus } from "../api/tasks";
import { getDashboardStats } from "../api/dashboard";
import { useSocket } from "../hooks/useSocket";
import ActivityFeed from "../components/ActivityFeed";
import NotificationsDropdown from "../components/NotificationsDropdown";
import CreateTaskModal from "../components/CreateTaskModal";
import CreateProjectModal from "../components/CreateProjectModal";
import AdminStats from "../components/AdminStats";
import PMStats from "../components/PMStats";
import TaskFilters from "../components/TaskFilters";

const STATUS_OPTIONS = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
const STATUS_LABELS: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};
const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};
const PRIORITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export default function Dashboard() {
  const { user, accessToken, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [taskModalProjectId, setTaskModalProjectId] = useState("");
  const { activities, connected, liveNotifications, onlineCount } = useSocket(accessToken);

  const canCreate = user?.role === "ADMIN" || user?.role === "PM";

  // Re-fetch tasks whenever the URL's filter params change
  const filterKey = searchParams.toString();

  useEffect(() => {
    if (!accessToken) return;
    load();
  }, [accessToken, filterKey]);

  async function load() {
    setLoading(true);
    const filterParams: Record<string, string> = {};
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const dueAfter = searchParams.get("dueAfter");
    const dueBefore = searchParams.get("dueBefore");
    if (status) filterParams.status = status;
    if (priority) filterParams.priority = priority;
    if (dueAfter) filterParams.dueAfter = dueAfter;
    if (dueBefore) filterParams.dueBefore = dueBefore;

    const [p, t, s] = await Promise.all([
      getProjects(),
      getTasks(filterParams),
      getDashboardStats(),
    ]);
    setProjects(p);
    setTasks(t);
    setStats(s);
    if (p.length > 0) setTaskModalProjectId(p[0].id);
    setLoading(false);
  }

  async function handleStatusChange(taskId: string, newStatus: string) {
    await updateTaskStatus(taskId, newStatus);
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
  }

  const overdueCount = tasks.filter((t) => t.isOverdue).length;

  // Developer's tasks: sorted by priority first, then due date — per spec
  const displayedTasks =
    user?.role === "DEVELOPER"
      ? [...tasks].sort((a, b) => {
          const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
          if (pDiff !== 0) return pDiff;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        })
      : tasks;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Client Project Dashboard</h1>
          <p className="text-sm text-slate-500">
            {user?.name} · <span className="font-medium">{user?.role}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationsDropdown liveNotifications={liveNotifications} />
          <button
            onClick={logout}
            className="text-sm font-medium text-slate-600 hover:text-red-600 transition-colors px-4 py-2 rounded-lg hover:bg-red-50"
          >
            Log out
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">
              {user?.role === "DEVELOPER" ? "My Projects" : "Total Projects"}
            </p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">{projects.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">
              {user?.role === "DEVELOPER" ? "My Tasks" : "Total Tasks"}
            </p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">{tasks.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">Overdue</p>
            <p className="text-2xl font-semibold text-red-600 mt-1">{overdueCount}</p>
          </div>
        </div>

        {/* Role-specific stats */}
        {stats && user?.role === "ADMIN" && (
          <AdminStats
            statusBreakdown={stats.statusBreakdown}
            overdueCount={stats.overdueCount}
            onlineCount={onlineCount}
          />
        )}
        {stats && user?.role === "PM" && (
          <PMStats
            priorityBreakdown={stats.priorityBreakdown}
            upcomingThisWeek={stats.upcomingThisWeek}
          />
        )}

        {/* Action buttons — Admin/PM only */}
        {canCreate && (
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setShowProjectModal(true)}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              + New Project
            </button>
            <button
              onClick={() => setShowTaskModal(true)}
              disabled={projects.length === 0}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              title={projects.length === 0 ? "Create a project first" : ""}
            >
              + New Task
            </button>
          </div>
        )}

        {/* Filters */}
        <TaskFilters />

        {/* Task list + Activity feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">
                {user?.role === "DEVELOPER" ? "My Tasks" : "Tasks"}
              </h2>
            </div>

            {loading ? (
              <p className="p-6 text-sm text-slate-500">Loading...</p>
            ) : displayedTasks.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">No tasks match these filters.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {displayedTasks.map((task) => (
                  <div key={task.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">{task.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {task.project?.name} · Due {new Date(task.dueDate).toLocaleDateString()}
                        {task.isOverdue && (
                          <span className="ml-2 text-red-600 font-medium">Overdue</span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${PRIORITY_COLORS[task.priority]}`}
                      >
                        {task.priority}
                      </span>

                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value)}
                        className="text-sm border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <ActivityFeed activities={activities} connected={connected} />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showProjectModal && (
        <CreateProjectModal
          onClose={() => setShowProjectModal(false)}
          onCreated={load}
        />
      )}
      {showTaskModal && (
        <CreateTaskModal
          projectId={taskModalProjectId}
          onClose={() => setShowTaskModal(false)}
          onCreated={load}
        />
      )}
    </div>
  );
}