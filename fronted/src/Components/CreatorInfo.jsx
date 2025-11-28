import React from 'react';
import { User, Calendar } from 'lucide-react';

const CreatorInfo = ({ createdByName, createdAt }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'לא זמין';
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex gap-4 w-fit" dir="rtl">
      {/* קוביה 1: נוצר על ידי */}
      <div className="w-64 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border-2 border-orange-200">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-100">
            <User className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <span className="text-xs text-orange-600 font-medium">נוצר על ידי</span>
            <p className="text-sm font-bold text-slate-900">{createdByName || 'לא זמין'}</p>
          </div>
        </div>
      </div>

      {/* קוביה 2: תאריך יצירה */}
      <div className="w-64 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border-2 border-orange-200">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-100">
            <Calendar className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <span className="text-xs text-orange-600 font-medium">תאריך יצירה</span>
            <p className="text-sm font-bold text-slate-900">{formatDate(createdAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorInfo;