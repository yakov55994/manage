// ToastProvider.jsx - Corrected
import React, { createContext, useContext, useEffect, useState } from "react";
import * as Toast from "@radix-ui/react-toast";

const ToastContext = createContext(() => {});

export const ToastProvider = ({ children }) => {
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [type, setType] = useState("success"); // "success" | "error"

    const showToast = (msg, toastType = "success") => {
        setMessage(msg);
        setType(toastType);
        setOpen(true);
    };
    useEffect(() => {
        if (open) {
            const timer = setTimeout(() => {
                setOpen(false);
            }, 3000); // 3000 מילישניות = 3 שניות
            
            return () => clearTimeout(timer);
        }
    }, [open]);
    return (
        <Toast.Provider>
            <ToastContext.Provider value={showToast}>
                {children}
                <Toast.Root open={open} onOpenChange={setOpen} className={`fixed bottom-5 right-5 px-4 py-3 rounded-lg shadow-md transition-all ${type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
                    <Toast.Title className="font-bold">{type === "success" ? "✅ הפעולה הצליחה" : "❌ הפעולה נכשלה"}</Toast.Title>
                    <Toast.Description>{message}</Toast.Description>
                </Toast.Root>
                <Toast.Viewport />
            </ToastContext.Provider>
        </Toast.Provider>
    );
};

export const useToast = () => useContext(ToastContext);