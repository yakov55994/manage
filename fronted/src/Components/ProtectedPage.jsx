import { useEffect, useState } from "react";
import api from "../api/api";
import { toast } from "sonner";

export default function ProtectedPage({ children, checkUrl }) {
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        await api.get(checkUrl); // רק בדיקה — כל 403 אומר חסום
        setAllowed(true);
      } catch (err) {
        if (err.response?.status === 403) {
          toast.error("אין הרשאה לדף זה", {
            className: "sonner-toast error rtl",
          });
          setAllowed(false);
        } else {
          toast.error("שגיאה בטעינה", { className: "sonner-toast error rtl" });
          setAllowed(false);
        }
      }
    })();
  }, [checkUrl]);

  if (allowed === null) {
    return <div className="text-center p-10 text-xl">טוען...</div>;
  }

  if (!allowed) {
    return (
      <div className="p-10 text-center text-red-600 text-3xl font-bold">
        אין הרשאה
      </div>
    );
  }

  return children;
}
