import type { ActivityEvent } from "../hooks/useSocket";

const STATUS_LABELS: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

function timeAgo(dateString: string) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins > 1 ? "s" : ""} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

export default function ActivityFeed({
  activities,
  connected,
}: {
  activities: ActivityEvent[];
  connected: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Live Activity</h2>
                <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
            connected ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
          }`}
        >
          {connected ? (
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full w-2 h-2 bg-green-500"></span>
            </span>
          ) : (
            <span className="w-2 h-2 rounded-full bg-slate-400" />
          )}
          {connected ? "Live" : "Connecting..."}
        </span>
      </div>

      <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
        {activities.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">No activity yet.</p>
        ) : (
          activities.map((event, i) => (
            <div key={`${event.taskId}-${event.timestamp}-${i}`} className="px-6 py-3 text-sm">
              <p className="text-slate-700">
                <span className="font-medium text-slate-900">{event.userName}</span>{" "}
                {event.oldStatus ? (
                  <>
                    moved <span className="font-medium">{event.taskTitle}</span> from{" "}
                    <span className="text-slate-500">{STATUS_LABELS[event.oldStatus]}</span> →{" "}
                    <span className="text-slate-900 font-medium">
                      {STATUS_LABELS[event.newStatus]}
                    </span>
                  </>
                ) : (
                  <>
                    created task <span className="font-medium">{event.taskTitle}</span>
                  </>
                )}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{timeAgo(event.timestamp)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}