import SystemLog from '../models/SystemLog.js';

/**
 * שמירת לוג במסד הנתונים
 * @param {object} params
 * @param {'login_success'|'login_failed'|'logout'|'error'|'info'} params.type
 * @param {string} params.message
 * @param {string} [params.username]
 * @param {string} [params.userId]
 * @param {string} [params.ip]
 * @param {string} [params.userAgent]
 * @param {object} [params.meta]
 */
export const saveLog = async ({ type, message, username, userId, ip, userAgent, meta }) => {
  try {
    await SystemLog.create({ type, message, username, userId, ip, userAgent, meta });
  } catch (err) {
    console.error('Logger error:', err.message);
  }
};

/**
 * חילוץ IP מבקשה
 */
export const getIp = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
};
