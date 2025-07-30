import React, { useState } from 'react';
import api from '../api/api';
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

        const uploadedFiles = [];

        for (const file of selectedFiles) {
            if (file.size > maxSize) {
                toast.error(`הקובץ ${file.name} גדול מדי`, {
                    className: "sonner-toast error rtl"
                });
                continue;
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', folder);

            try {
                const response = await api.post('/upload', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });

                if (response.data.file && response.data.file.url) {
                    // Save the entire file object from the response
                    uploadedFiles.push(response.data.file);

                    // Log to verify what's being returned
                    console.log("Uploaded file:", response.data.file);
                } else {
                    throw new Error(`שגיאה בהעלאת ${file.name}`);
                }
            } catch (err) {
                if (err.response) {
                    // אם יש תגובה מהשרת, נציג את השגיאה ממנו
                    toast.error(`שגיאה מהשרת: ${err.response.data.message || 'שגיאה בהעלאה'}`, {
                        className: "sonner-toast error rtl"
                    });
                } else {
                    // אם לא הייתה תגובה מהשרת, מדובר בשגיאה שקשורה לרשת או קוד
                    toast.error(`שגיאה בהעלאה: ${err.message || 'שגיאה לא צפויה'}`, {
                        className: "sonner-toast error rtl"
                    });
                }
            }
            

        }

        // Update local state
        setFiles((prev) => [...prev, ...uploadedFiles]);

        // IMPORTANT: Pass the full file objects to the parent component
        onUploadSuccess(uploadedFiles);
        setLoading(false);
    };

    // Rest of the component remains the same...

    return (
        <div className="mt-4">
            <label className="block text-sm font-medium mb-2">
                {label}
            </label>
            <input
                type="file"
                multiple
                accept=".xlsx, .xls, .pdf, .docx"  // הגבלה לסוגי קבצים נתמכים
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
