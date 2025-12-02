import React, { useState } from 'react';
import { toast } from 'sonner';
import { Lock } from 'lucide-react'; // אייקון לנעילה

function FileUploader({
    onUploadSuccess,
    folder = 'general',
    label = 'העלה קובץ',
    maxSize = 5 * 1024 * 1024,
    onDeleteSuccess,
    disabled = false, // 🔥 הוספתי prop חדש
    disabledMessage = "אין הרשאה להעלות קבצים" // 🔥 הודעה מותאמת אישית
}) {
    const [loading, setLoading] = useState(false);
    const [files, setFiles] = useState([]);

    const handleUpload = async (e) => {
        // 🔥 בדיקה ראשונית
        if (disabled) {
            toast.error(disabledMessage, {
                className: "sonner-toast error rtl"
            });
            e.target.value = null; // נקה את הבחירה
            return;
        }

        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length === 0) return;

        setLoading(true);

        const localFiles = [];

        for (const file of selectedFiles) {
            if (file.size > maxSize) {
                toast.error(`הקובץ ${file.name} גדול מדי`, {
                    className: "sonner-toast error rtl"
                });
                continue;
            }

            const localFile = {
                file: file,
                name: file.name,
                type: file.type,
                size: file.size,
                isLocal: true,
                url: URL.createObjectURL(file),
                folder: folder
            };

            localFiles.push(localFile);
        }

        setFiles((prev) => [...prev, ...localFiles]);
        onUploadSuccess(localFiles);
        
        toast.success(`${localFiles.length} קבצים נבחרו (יועלו בעת השמירה)`, {
            className: "sonner-toast success rtl"
        });
        
        setLoading(false);
    };

    return (
        <div className="mt-4">
            {/* <label className="block text-sm font-medium mb-2 flex items-center gap-2"> */}
            <label className="text-sm font-medium mb-2 flex items-center gap-2">
                {label}
                {disabled && <Lock className="w-4 h-4 text-gray-400" />}
            </label>
            
            {/* 🔥 הודעת אזהרה אם אין הרשאה */}
            {disabled && (
                <div className="mb-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        {disabledMessage}
                    </p>
                </div>
            )}

            <input
                type="file"
                multiple
                accept="*"
                onChange={handleUpload}
                disabled={disabled || loading} // 🔥 השבת אם אין הרשאה או בטעינה
                className={`block w-full text-sm file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0 file:text-sm file:font-semibold
                    file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            />

            {loading && (
                <div className="mt-2 flex justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                </div>
            )}
        </div>
    );
}

export default FileUploader;