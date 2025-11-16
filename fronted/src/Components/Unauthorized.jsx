import { Lock } from "lucide-react";

export default function Unauthorized() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6">
      <Lock size={80} className="text-red-500 mb-4" />
      <h1 className="text-3xl font-bold text-gray-800 mb-3">אין לך גישה</h1>
      <p className="text-gray-600 text-lg">
        אין לך הרשאה לצפות בעמוד זה. אנא פנה למנהל המערכת.
      </p>
    </div>
  );
}
