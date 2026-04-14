import { Plus, Users } from "lucide-react";
import { Link } from "react-router-dom";

export function SuppliersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-4xl font-semibold text-slate-900">Suppliers</h1>
          <p className="mt-1 text-lg text-slate-500">
            Manage supplier relationships and tie purchase orders to automated reorder suggestions from{" "}
            <Link to="/smart-ops" className="font-medium text-teal-700 hover:underline">
              Smart ops
            </Link>
            .
          </p>
        </div>
        <button type="button" className="btn-primary inline-flex items-center gap-2 px-6">
          <Plus size={15} />
          Add Supplier
        </button>
      </div>

      <section className="panel min-h-[210px] p-8">
        <div className="flex h-full min-h-[140px] flex-col items-center justify-center text-center">
          <Users size={44} className="text-slate-300" />
          <p className="mt-4 text-slate-500">
            No suppliers found. Add your first supplier to get started.
          </p>
        </div>
      </section>
    </div>
  );
}
