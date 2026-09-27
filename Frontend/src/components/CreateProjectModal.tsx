import { useEffect, useState } from "react";
import { createProject } from "../api/projects";
import { getClients, createClient } from "../api/clients";

export default function CreateProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [clients, setClients] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [creatingNewClient, setCreatingNewClient] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getClients().then((c) => {
      setClients(c);
      if (c.length > 0) setClientId(c[0].id);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      let finalClientId = clientId;

      if (creatingNewClient) {
        const newClient = await createClient(newClientName);
        finalClientId = newClient.id;
      }

      await createProject({
        name,
        description: description || undefined,
        clientId: finalClientId,
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        <form onSubmit={handleSubmit} className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-5">New Project</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Project name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="block w-full px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="block w-full px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">Client</label>
                <button
                  type="button"
                  onClick={() => setCreatingNewClient(!creatingNewClient)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  {creatingNewClient ? "Choose existing" : "+ New client"}
                </button>
              </div>

              {creatingNewClient ? (
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Client name"
                  required
                  className="block w-full px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                />
              ) : (
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  required
                  className="block w-full px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                >
                  {clients.length === 0 && <option value="">No clients yet</option>}
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}