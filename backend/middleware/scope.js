// middleware/scope.js
export const withScope = (req, res, next) => {
  if (req.user?.role === 'admin') {
    req.scope = { mode: 'all', projects: [], suppliers: [], ops: {} };
    return next();
  }
  const p = req.user?.permissions || {};
  req.scope = {
    mode: p.mode || 'all',
    projects: Array.isArray(p.projects) ? p.projects : [],
    suppliers: Array.isArray(p.suppliers) ? p.suppliers : [],
    ops: p.ops || {},
    validFrom: p.validFrom,
    validUntil: p.validUntil,
  };
  // תוקף (אופציונלי)
  const now = new Date();
  if (req.scope.validFrom && now < new Date(req.scope.validFrom)) {
    return res.status(403).json({ message: "Permissions not yet active" });
  }
  if (req.scope.validUntil && now > new Date(req.scope.validUntil)) {
    return res.status(403).json({ message: "Permissions expired" });
  }
  next();
};

// בדיקת פעולה (CRUD/Export) לפי משאב
export const requireOp = (resource, op) => (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  const allowed = !!req.scope?.ops?.[resource]?.[op];
  if (!allowed) return res.status(403).json({ message: 'אין הרשאה לבצע פעולה זו' });
  next();
};

// מסנן רשימת פרויקטים (לרוטים של GET /projects)
export const applyProjectListFilter = (baseFilter = {}) => (req, _res, next) => {
  if (req.user?.role === 'admin') {
    req.queryFilter = baseFilter;
    return next();
  }
  const { mode, projects } = req.scope;
  const filter = { ...baseFilter };
  if (mode === 'only') {
    filter._id = { $in: (projects?.length ? projects : ['__none__']) };
  }
  req.queryFilter = filter;
  next();
};

// מסנן רשימת ספקים (לרוטים של GET /suppliers)
export const applySupplierListFilter = (baseFilter = {}) => (req, _res, next) => {
  if (req.user?.role === 'admin') {
    req.queryFilter = baseFilter;
    return next();
  }
  const { mode, suppliers } = req.scope;
  const filter = { ...baseFilter };
  if (mode === 'only') {
    filter._id = { $in: (suppliers?.length ? suppliers : ['__none__']) };
  }
  req.queryFilter = filter;
  next();
};

// בדיקת גישה לפרויקט לפי :id
export const ensureProjectAccess = (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  const { mode, projects } = req.scope;
  if (mode !== 'only') return next(); // במצב 'all' אין סינון
  const ok = projects?.some(id => String(id) === String(req.params.id));
  if (!ok) return res.status(403).json({ message: 'אין לך הרשאה לפרויקט זה' });
  next();
};

// בדיקת גישה לספק לפי :id
export const ensureSupplierAccess = (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  const { mode, suppliers } = req.scope;
  if (mode !== 'only') return next();
  const ok = suppliers?.some(id => String(id) === String(req.params.id));
  if (!ok) return res.status(403).json({ message: 'אין לך הרשאה לספק זה' });
  next();
};

export const applyOrderListFilter = (baseFilter = {}) => (req, _res, next) => {
  if (req.user?.role === 'admin') {
    req.queryFilter = baseFilter;
    return next();
  }
  const { mode, projects, suppliers } = req.scope || {};
  const filter = { ...baseFilter };

  if (mode === 'only') {
    const or = [];
    if (projects?.length) or.push({ project: { $in: projects } });
    if (suppliers?.length) or.push({ supplier: { $in: suppliers } });

    // אם אין פרויקטים ואין ספקים ברשימה – שלא יחזיר כלום
    filter.$or = or.length ? or : [{ _id: { $in: [] } }];
  }

  req.queryFilter = filter;
  next();
};

// בדיקת גישה להזמנה בודדת לפי ה-:id
// נטען את ההזמנה ובודקים אם project/supplier שלה עומדים בהיקף (scope)
export const ensureOrderAccess = async (req, res, next) => {
  try {
    if (req.user?.role === 'admin') return next();

    const { mode, projects, suppliers } = req.scope || {};
    if (mode !== 'only') return next(); // במצב 'all' אין מגבלה

    const order = await Order.findById(req.params.id)
      .select('_id project supplier')
      .lean();

    if (!order) return res.status(404).json({ message: 'הזמנה לא נמצאה' });

    const projectOk  = order.project  ? projects?.some(id => String(id) === String(order.project))   : false;
    const supplierOk = order.supplier ? suppliers?.some(id => String(id) === String(order.supplier)) : false;

    // אם ההזמנה לא קשורה לאף פרויקט/ספק מותר → חסימה
    if (!projectOk && !supplierOk) {
      return res.status(403).json({ message: 'אין לך הרשאה להזמנה זו' });
    }

    next();
  } catch (err) {
    return res.status(500).json({ message: 'שגיאה בבדיקת הרשאות להזמנה' });
  }
};
