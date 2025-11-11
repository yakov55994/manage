export function canUser({ user, projectId, resource, action }) {
  if (!user?.isActive) return false;
  if (user.role === 'admin') return true;

  // משיכת הרשאת פרויקט
  const perm = user.permissions?.projects?.find(
    p => String(p.project) === String(projectId)
  );

  // 🔧 ברירת מחדל אם אין רשומה לפרויקט:
  const defaultAccess = 'edit'; // אפשר להפוך ל-'view' אם אתה רוצה לברור כבררת מחדל
  if (!perm) {
    return action === 'read' || defaultAccess === 'edit';
  }

  // 🔍 הרשאה כללית לפרויקט: view/edit
  const projectAccess = perm.access || 'view';
  if (resource === 'project') {
    return action === 'read' || projectAccess === 'edit';
  }

  // 🎯 הרשאה לפי מודולים:
  // modules: { invoices: 'view|edit', orders: 'view|edit', suppliers: 'view|edit', files: 'view|edit' }
  const moduleAccess = perm.modules?.[resource] || projectAccess;

  return action === 'read' || moduleAccess === 'edit';
}
