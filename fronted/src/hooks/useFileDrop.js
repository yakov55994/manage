import { useCallback, useState } from 'react';

/**
 * Adds drag-and-drop support to a dropzone element.
 * Spread `dropHandlers` onto the container that should accept dropped files,
 * and use `isDragging` to highlight it while a file is dragged over it.
 */
export default function useFileDrop(onFiles, { disabled = false } = {}) {
    const [isDragging, setIsDragging] = useState(false);

    const onDragEnter = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;
        setIsDragging(true);
    }, [disabled]);

    const onDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;
        setIsDragging(true);
    }, [disabled]);

    const onDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget.contains(e.relatedTarget)) return;
        setIsDragging(false);
    }, []);

    const onDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (disabled) return;
        const files = Array.from(e.dataTransfer?.files || []);
        if (files.length > 0) onFiles(files);
    }, [disabled, onFiles]);

    return {
        isDragging,
        dropHandlers: { onDragEnter, onDragOver, onDragLeave, onDrop },
    };
}
