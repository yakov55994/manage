import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from "recharts";

const BudgetVsExpensesChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500">
        אין נתונים להצגה
      </div>
    );
  }

  // מגבילים ל-10 פרויקטים מובילים
  const chartData = data.slice(0, 10);

  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toLocaleString("he-IL");
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const project = chartData.find((p) => p.projectName === label);
      return (
        <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200">
          <p className="font-bold text-gray-900 mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            <p className="flex justify-between gap-4">
              <span className="text-orange-600">תקציב:</span>
              <span className="font-medium" dir="ltr">
                {project?.budget?.toLocaleString("he-IL")} ש״ח
              </span>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-red-600">הוצאות:</span>
              <span className="font-medium" dir="ltr">
                {project?.spent?.toLocaleString("he-IL")} ש״ח
              </span>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-green-600">נותר:</span>
              <span className="font-medium" dir="ltr">
                {project?.remaining?.toLocaleString("he-IL")} ש״ח
              </span>
            </p>
            <p className="flex justify-between gap-4 border-t pt-1 mt-1">
              <span className="text-gray-600">ניצול:</span>
              <span className={`font-bold ${
                project?.percentUsed >= 90 ? "text-red-600" :
                project?.percentUsed >= 70 ? "text-amber-600" : "text-green-600"
              }`}>
                {project?.percentUsed}%
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // צבעים לפי אחוז ניצול
  const getBarColor = (percentUsed) => {
    if (percentUsed >= 90) return "#ef4444"; // אדום
    if (percentUsed >= 70) return "#f59e0b"; // כתום
    return "#22c55e"; // ירוק
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          type="number"
          tickFormatter={formatCurrency}
          tick={{ fill: "#6b7280", fontSize: 12 }}
        />
        <YAxis
          type="category"
          dataKey="projectName"
          width={100}
          tick={{ fill: "#374151", fontSize: 12 }}
          tickFormatter={(value) =>
            value.length > 12 ? `${value.slice(0, 12)}...` : value
          }
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ paddingTop: "10px" }}
          formatter={(value) => (
            <span className="text-sm font-medium text-gray-700">{value}</span>
          )}
        />
        <Bar dataKey="budget" name="תקציב" fill="#fb923c" radius={[0, 4, 4, 0]} />
        <Bar dataKey="spent" name="הוצאות" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry.percentUsed)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default BudgetVsExpensesChart;
