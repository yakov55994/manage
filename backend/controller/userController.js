import userRoutes from '../routes/UserRoutes.js';
import bcrypt from 'bcrypt'
import User from '../models/userSchema.js/'

const userControllers = {
// קבלת כל המשתמשים
getAllUsers : async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'שגיאה בקבלת המשתמשים' });
  }
},

// קבלת משתמש ספציפי
getUserById : async (req, res) => {
  try {
    const user = await User.findById(req.params.id, '-password');
    if (!user) {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'שגיאה בקבלת המשתמש' });
  }
},

// יצירת משתמש חדש
createUser : async (req, res) => {
  try {
    const { name, email, password, role, phone, permissions } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ 
        message: 'שם, אימייל, סיסמה ותפקיד הם שדות חובה' 
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'משתמש עם המייל הזה כבר קיים במערכת' 
      });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      phone: phone || '',
      permissions: permissions || {
        projects: false,
        invoices: false,
        suppliers: false,
        orders: false,
        reports: false
      },
      status: 'פעיל',
      createdAt: new Date(),
      createdBy: req.user.id
    });

    await newUser.save();

    const userResponse = newUser.toObject();
    delete userResponse.password;

    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'שגיאה ביצירת המשתמש' });
  }
},

// עדכון משתמש
updateUser : async (req, res) => {
  try {
    const { name, email, password, role, phone, permissions } = req.body;
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }

    if (!name || !email || !role) {
      return res.status(400).json({ 
        message: 'שם, אימייל ותפקיד הם שדות חובה' 
      });
    }

    const existingUser = await User.findOne({ email, _id: { $ne: userId } });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'משתמש עם המייל הזה כבר קיים במערכת' 
      });
    }

    user.name = name;
    user.email = email;
    user.role = role;
    user.phone = phone || '';
    user.permissions = permissions || {
      projects: false,
      invoices: false,
      suppliers: false,
      orders: false,
      reports: false
    };

    if (password) {
      const saltRounds = 10;
      user.password = await bcrypt.hash(password, saltRounds);
    }

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json(userResponse);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'שגיאה בעדכון המשתמש' });
  }
},

// מחיקת משתמש
deleteUser : async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }

    await user.deleteOne();
    res.json({ message: 'המשתמש נמחק בהצלחה' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'שגיאה במחיקת המשתמש' });
  }
},

// עדכון סטטוס משתמש
updateUserStatus : async (req, res) => {
  try {
    const { status } = req.body;
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }

    if (!['פעיל', 'לא פעיל'].includes(status)) {
      return res.status(400).json({ message: 'סטטוס לא תקין' });
    }

    user.status = status;
    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json(userResponse);
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ message: 'שגיאה בעדכון סטטוס המשתמש' });
  }
},

}
export default userControllers  

