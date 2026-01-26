import {
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip
} from "recharts";

const PaymentStatusChart = ({ data }) => {
  if (!data) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500">
        אין נתונים להצגה
      </div>
    );
  }

  const COLORS = {
    paid: "#22c55e",      // ירוק - שולם
    unpaid: "#ef4444",    // אדום - לא שולם
    inProcess: "#f59e0b"  // כתום - יצא לתשלום
  };

  const LABELS = {
    paid: "שולם",
    unpaid: "לא שולם",
    inProcess: "יצא לתשלום"
  };

  // המרת הנתונים לפורמט של Recharts
  const chartData = [
    { name: LABELS.paid, value: data.paid?.count || 0, amount: data.paid?.amount || 0, key: "paid" },
    { name: LABELS.unpaid, value: data.unpaid?.count || 0, amount: data.unpaid?.amount || 0, key: "unpaid" },
    { name: LABELS.inProcess, value: data.inProcess?.count || 0, amount: data.inProcess?.amount || 0, key: "inProcess" }
  ].filter(item => item.value > 0);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500">
        אין חשבוניות להצגה
      </div>
    );
  }

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const percentage = ((item.value / total) * 100).toFixed(1);
      return (
        <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200">
          <p className="font-bold text-gray-900 mb-2">{item.name}</p>
          <div className="space-y-1 text-sm">
            <p className="flex justify-between gap-4">
              <span className="text-gray-600">כמות:</span>
              <span className="font-medium">{item.value} חשבוניות</span>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-gray-600">סכום:</span>
              <span className="font-medium" dir="ltr">
                {item.amount?.toLocaleString("he-IL")} ש״ח
              </span>
            </p>
            <p className="flex justify-between gap-4 border-t pt-1 mt-1">
              <span className="text-gray-600">אחוז:</span>
              <span className="font-bold">{percentage}%</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null; // לא מציג תווית אם פחות מ-5%

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-sm font-bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={100}
            innerRadius={40}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[entry.key]}
                stroke="white"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            formatter={(value, entry) => (
              <span className="text-sm font-medium text-gray-700">
                {value} ({chartData.find(d => d.name === value)?.value || 0})
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* סיכום */}
      <div className="text-center mt-2">
        <p className="text-sm text-gray-600">
          סה״כ: <span className="font-bold">{total}</span> חשבוניות |
          <span className="font-bold" dir="ltr"> {data.total?.amount?.toLocaleString("he-IL")} ש״ח</span>
        </p>
      </div>
    </div>
  );
};

export default PaymentStatusChart;
