import { X } from "lucide-react";

export default function Modal({ show, onClose, children }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* רקע */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative flex min-h-full items-start justify-center p-4 overflow-y-auto">
        <div
          className="relative w-full max-w-3xl mt-20 mb-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="pointer-events-none absolute -inset-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-3xl opacity-20 blur-xl"></div>

          <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* איקס */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 left-3 p-2 rounded-full hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-300"
            >
              <X className="w-6 h-6 text-slate-700" />
            </button>

            <div className="max-h-[88vh] overflow-y-auto p-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
