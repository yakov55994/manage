export default function NoAccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-10 rounded-xl shadow-xl text-center">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-red-600 mb-4">אין הרשאה</h1>
        <p className="text-gray-600">אין לך הרשאה לצפות בתוכן זה.</p>
      </div>
    </div>
  );
}
