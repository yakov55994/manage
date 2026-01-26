import { ClipLoader } from "react-spinners";

const ChartCard = ({ title, subtitle, icon: Icon, children, loading, color = "orange" }) => {
  const colorClasses = {
    orange: {
      iconBg: "bg-gradient-to-br from-orange-400 to-amber-400",
      border: "border-orange-100"
    },
    green: {
      iconBg: "bg-gradient-to-br from-green-400 to-emerald-400",
      border: "border-green-100"
    },
    purple: {
      iconBg: "bg-gradient-to-br from-purple-400 to-violet-400",
      border: "border-purple-100"
    },
    blue: {
      iconBg: "bg-gradient-to-br from-blue-400 to-indigo-400",
      border: "border-blue-100"
    }
  };

  const colors = colorClasses[color] || colorClasses.orange;

  return (
    <div className={`bg-white rounded-2xl shadow-lg p-4 sm:p-6 border ${colors.border}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        {Icon && (
          <div className={`${colors.iconBg} p-2 rounded-xl shadow-md`}>
            <Icon className="text-white w-5 h-5" />
          </div>
        )}
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">{title}</h3>
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-[300px]">
          <ClipLoader size={40} color="#fb923c" />
        </div>
      ) : (
        children
      )}
    </div>
  );
};

export default ChartCard;
