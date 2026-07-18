import React, { useState } from 'react';
import { toast } from 'sonner';
import { Lock, UploadCloud } from 'lucide-react';
import DocumentTypeModal from './DocumentTypeModal';
import useFileDrop from '../hooks/useFileDrop';

function FileUploader({
    onUploadSuccess,
    folder = 'general',
    label = 'העלה קובץ',
    maxSize = 15 * 1024 * 1024,
    onDeleteSuccess,
    disabled = false,
    disabledMessage = "אין הרשאה להעלות קבצים",
    askForDocumentType = false, // 🔥 חדש - לשאול על סוג מסמך
    isExistingInvoice = false, // 🔥 חדש - האם זו חשבונית קיימת
    documentType: externalDocumentType = "" // סוג מסמך שכבר נבחר בטופס החיצוני
}) {
    const [loading, setLoading] = useState(false);
    const [files, setFiles] = useState([]);
    const [pendingFiles, setPendingFiles] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [currentFileIndex, setCurrentFileIndex] = useState(0);

    const handleUpload = async (e) => {
        if (disabled) {
            toast.error(disabledMessage, {
                className: "sonner-toast error rtl"
            });
            e.target.value = null;
            return;
        }

        const selectedFiles = Array.from(e.target.files);
        await processFiles(selectedFiles);
        e.target.value = null;
    };

    const handleDrop = (droppedFiles) => {
        if (disabled) {
            toast.error(disabledMessage, {
                className: "sonner-toast error rtl"
            });
            return;
        }
        processFiles(droppedFiles);
    };

    const { isDragging, dropHandlers } = useFileDrop(handleDrop, { disabled: disabled || loading });

    const processFiles = async (selectedFiles) => {
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
                folder: folder,
                documentType: null // 🔥 יושלם מאוחר יותר אם צריך
            };

            localFiles.push(localFile);
        }

        // אם יש סוג מסמך מהטופס החיצוני - השתמש בו ישירות בלי מודל
        if (askForDocumentType && externalDocumentType && localFiles.length > 0) {
            const filesWithType = localFiles.map(f => ({ ...f, documentType: externalDocumentType }));
            setFiles((prev) => [...prev, ...filesWithType]);
            onUploadSuccess(filesWithType);

            toast.success(`${filesWithType.length} קבצים נבחרו (יועלו בעת השמירה)`, {
                className: "sonner-toast success rtl"
            });

            setLoading(false);
        } else if (askForDocumentType && localFiles.length > 0) {
            setPendingFiles(localFiles);
            setCurrentFileIndex(0);
            setModalOpen(true);
            setLoading(false);
        } else {
            // אחרת - העבר ישירות
            setFiles((prev) => [...prev, ...localFiles]);
            onUploadSuccess(localFiles);

            toast.success(`${localFiles.length} קבצים נבחרו (יועלו בעת השמירה)`, {
                className: "sonner-toast success rtl"
            });

            setLoading(false);
        }
    };

    const handleDocumentTypeSelect = (documentType, documentNumber) => {
        const updatedFiles = [...pendingFiles];
        updatedFiles[currentFileIndex].documentType = documentType;
        if (documentNumber !== undefined) {
            updatedFiles[currentFileIndex].documentNumber = documentNumber;
        }

        // אם יש עוד קבצים - עבור להבא
        if (currentFileIndex < updatedFiles.length - 1) {
            setCurrentFileIndex(currentFileIndex + 1);
        } else {
            // סיימנו - העבר את כל הקבצים
            setFiles((prev) => [...prev, ...updatedFiles]);
            onUploadSuccess(updatedFiles);
            setPendingFiles([]);
            setCurrentFileIndex(0);
            setModalOpen(false); // 🔥 סגור את המודל אחרי הקובץ האחרון

            toast.success(`${updatedFiles.length} קבצים נבחרו (יועלו בעת השמירה)`, {
                className: "sonner-toast success rtl"
            });
        }
    };

    return (
        <>
            <div className="mt-4">
                <label className="text-sm font-medium mb-2 flex items-center gap-2">
                    {label}
                    {disabled && <Lock className="w-4 h-4 text-gray-400" />}
                </label>

                {disabled && (
                    <div className="mb-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800 flex items-center gap-2">
                            <Lock className="w-4 h-4" />
                            {disabledMessage}
                        </p>
                    </div>
                )}

                <div
                    {...dropHandlers}
                    className={`rounded-lg border-2 border-dashed p-3 transition-colors
                        ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-transparent'}`}
                >
                    <input
                        type="file"
                        multiple
                        accept="*"
                        onChange={handleUpload}
                        disabled={disabled || loading}
                        className={`block w-full text-sm file:mr-4 file:py-2 file:px-4
                            file:rounded-md file:border-0 file:text-sm file:font-semibold
                            file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100
                            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    />
                    <p className="mt-1 text-xs text-gray-400 flex items-center gap-1">
                        <UploadCloud className="w-3.5 h-3.5" />
                        ניתן גם לגרור קבצים לכאן
                    </p>
                </div>

                {loading && (
                    <div className="mt-2 flex justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                    </div>
                )}
            </div>

            <DocumentTypeModal
                open={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setPendingFiles([]);
                    setCurrentFileIndex(0);
                }}
                onSelect={handleDocumentTypeSelect}
                fileName={pendingFiles[currentFileIndex]?.name}
                showInvoiceNumber={isExistingInvoice}
            />
        </>
    );
}

export default FileUploader;