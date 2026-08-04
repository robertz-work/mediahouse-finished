"use client";

/**
 * Modal wyboru celu przy dodawaniu nośnika do kampanii:
 * dodać do istniejącego (bieżącego) szkicu, czy utworzyć nową kampanię.
 * Pokazywany tylko gdy klient ma już jakiś szkic.
 */

interface Props {
  open: boolean;
  itemCount: number;
  total: number;
  busy?: boolean;
  onSelect: (target: "existing" | "new") => void;
  onCancel: () => void;
}

export default function AddTargetDialog({
  open,
  itemCount,
  total,
  busy,
  onSelect,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

      <div
        className="absolute inset-0 bg-slate-900/50"
        onClick={busy ? undefined : onCancel}
      />


      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900">Dodaj do kampanii</h3>
        <p className="mt-2 text-sm text-slate-600">
          Masz już rozpoczęty szkic kampanii ({itemCount}{" "}
          {itemCount === 1 ? "nośnik" : "nośniki/-ów"},{" "}
          {total.toLocaleString("pl-PL")} zł netto). Gdzie dodać ten nośnik?
        </p>

        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={() => onSelect("existing")}
            disabled={busy}
            className="rounded-xl bg-pink-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-pink-700 disabled:opacity-50"
          >
            Dodaj do bieżącego szkicu
          </button>
          <button
            onClick={() => onSelect("new")}
            disabled={busy}
            className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Utwórz nową kampanię
          </button>
          <button
            onClick={onCancel}
            disabled={busy}
            className="mt-1 text-xs font-medium text-slate-400 transition hover:text-slate-600 disabled:opacity-50"
          >
            Anuluj
          </button>
        </div>
      </div>
    </div>
  );
}
