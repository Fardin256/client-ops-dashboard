const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};
const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

export default function PMStats({
  priorityBreakdown,
  upcomingThisWeek,
}: {
  priorityBreakdown: { priority: string; _count: number }[];
  upcomingThisWeek: any[];
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 text-sm mb-3">Tasks by Priority</h3>
        <div className="space-y-2">
          {Object.keys(PRIORITY_LABELS).map((priority) => {
            const found = priorityBreakdown.find((p) => p.priority === priority);
            return (
              <div key={priority} className="flex items-center justify-between">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_COLORS[priority]}`}>
                  {PRIORITY_LABELS[priority]}
                </span>
                <span className="text-sm font-semibold text-slate-900">{found?._count || 0}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 text-sm mb-3">Due This Week</h3>
        {upcomingThisWeek.length === 0 ? (
          <p className="text-xs text-slate-500">Nothing due this week.</p>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {upcomingThisWeek.map((task) => (
              <div key={task.id} className="text-xs">
                <p className="font-medium text-slate-800 truncate">{task.title}</p>
                <p className="text-slate-500">
                  {task.assignee?.name} · {new Date(task.dueDate).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}