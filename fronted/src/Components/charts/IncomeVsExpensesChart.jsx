import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

const IncomeVsExpensesChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500">
        אין נתונים להצגה
      </div>
    );
  }

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
      const dataPoint = data.find((d) => d.periodLabel === label);
      return (
        <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200">
          <p className="font-bold text-gray-900 mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            <p className="flex justify-between gap-4">
              <span className="text-green-600">הכנסות:</span>
              <span className="font-medium" dir="ltr">
                {dataPoint?.income?.toLocaleString("he-IL")} ש״ח
              </span>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-red-600">הוצאות:</span>
              <span className="font-medium" dir="ltr">
                {dataPoint?.expenses?.toLocaleString("he-IL")} ש״ח
              </span>
            </p>
            <p className="flex justify-between gap-4 border-t pt-1 mt-1">
              <span className="text-gray-600">יתרה:</span>
              <span className={`font-bold ${
                dataPoint?.balance >= 0 ? "text-green-600" : "text-red-600"
              }`} dir="ltr">
                {dataPoint?.balance?.toLocaleString("he-IL")} ש״ח
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={data}
        margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
      >
        <defs>
          <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
          </linearGradient>
          <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="periodLabel"
          tick={{ fill: "#6b7280", fontSize: 12 }}
          tickFormatter={(value) => {
            const parts = value.split(" ");
            return parts[0];
          }}
        />
        <YAxis
          tickFormatter={formatCurrency}
          tick={{ fill: "#6b7280", fontSize: 12 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ paddingTop: "10px" }}
          formatter={(value) => (
            <span className="text-sm font-medium text-gray-700">{value}</span>
          )}
        />
        <Area
          type="monotone"
          dataKey="income"
          name="הכנסות"
          stroke="#22c55e"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorIncome)"
        />
        <Area
          type="monotone"
          dataKey="expenses"
          name="הוצאות"
          stroke="#ef4444"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorExpenses)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default IncomeVsExpensesChart;
