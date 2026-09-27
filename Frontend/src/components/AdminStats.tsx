import { useEffect, useState } from "react";
import { getOnlineCount } from "../api/dashboard";

const STATUS_LABELS: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

export default function AdminStats({
  statusBreakdown,
  overdueCount,
  onlineCount,
}: {
  statusBreakdown: { status: string; _count: number }[];
  overdueCount: number;
  onlineCount: number | null;
}) {
  const [initialCount, setInitialCount] = useState<number | null>(null);

  useEffect(() => {
    getOnlineCount().then(setInitialCount);
  }, []);

  const displayCount = onlineCount !== null ? onlineCount : initialCount;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 text-sm">Tasks by Status</h3>
        <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
          <span className="relative flex w-2 h-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full w-2 h-2 bg-green-500"></span>
          </span>
          {displayCount ?? "..."} online now
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.keys(STATUS_LABELS).map((status) => {
          const found = statusBreakdown.find((s) => s.status === status);
          return (
            <div key={status} className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-xl font-semibold text-slate-900">{found?._count || 0}</p>
              <p className="text-xs text-slate-500 mt-0.5">{STATUS_LABELS[status]}</p>
            </div>
          );
        })}
      </div>

      {overdueCount > 0 && (
        <p className="text-xs text-red-600 font-medium mt-3">
          {overdueCount} task{overdueCount > 1 ? "s" : ""} overdue across all projects
        </p>
      )}
    </div>
  );
}