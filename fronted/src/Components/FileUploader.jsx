import React, { useState } from 'react';
import { toast } from 'sonner';

function FileUploader({
    onUploadSuccess,
    folder = 'general',
    label = 'העלה קובץ',
    maxSize = 5 * 1024 * 1024,
    onDeleteSuccess
}) {
    const [loading, setLoading] = useState(false);
    const [files, setFiles] = useState([]);

    const handleUpload = async (e) => {
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

            // במקום להעלות לקלאודינרי, רק שמור את הקובץ במקומי
            const localFile = {
                file: file,                    // הקובץ המקורי
                name: file.name,
                type: file.type,
                size: file.size,
                isLocal: true,                 // סימון שזה קובץ מקומי
                url: URL.createObjectURL(file), // URL זמני לתצוגה מקדימה
                folder: folder
            };

            localFiles.push(localFile);
        }

        // Update local state
        setFiles((prev) => [...prev, ...localFiles]);

        // העבר את הקבצים המקומיים לקומפוננטה האב
        onUploadSuccess(localFiles);
        
        toast.success(`${localFiles.length} קבצים נבחרו (יועלו בעת השמירה)`, {
            className: "sonner-toast success rtl"
        });
        
        setLoading(false);
    };

    return (
        <div className="mt-4">
            <label className="block text-sm font-medium mb-2">
                {label}
            </label>
            <input
                type="file"
                multiple
                accept=".xlsx, .xls, .pdf, .docx"
                onChange={handleUpload}
                disabled={loading}
                className="block w-full text-sm file:mr-4 file:py-2 file:px-4
    file:rounded-md file:border-0 file:text-sm file:font-semibold
    file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100"
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