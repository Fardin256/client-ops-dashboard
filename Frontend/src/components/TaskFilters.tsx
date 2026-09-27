import { useSearchParams } from "react-router-dom";

const STATUS_OPTIONS = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
const STATUS_LABELS: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};
const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export default function TaskFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const status = searchParams.get("status") || "";
  const priority = searchParams.get("priority") || "";
  const dueAfter = searchParams.get("dueAfter") || "";
  const dueBefore = searchParams.get("dueBefore") || "";

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  }

  function clearAll() {
    setSearchParams({});
  }

  const hasActiveFilters = status || priority || dueAfter || dueBefore;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => updateParam("status", e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Priority</label>
          <select
            value={priority}
            onChange={(e) => updateParam("priority", e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
          >
            <option value="">All priorities</option>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Due after</label>
          <input
            type="date"
            value={dueAfter}
            onChange={(e) => updateParam("dueAfter", e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Due before</label>
          <input
            type="date"
            value={dueBefore}
            onChange={(e) => updateParam("dueBefore", e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
          />
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="text-sm font-medium text-slate-500 hover:text-red-600 px-3 py-1.5"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}