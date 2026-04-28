import argon2 from 'argon2';
import { getConfig, saveConfig } from '../utils/config.js';

export async function authCheck(password) {
  const config = getConfig();
  const stored = config.admin_password;
  if (!stored) return false;

  // Migrate plain text or bcrypt hash to argon2 on first successful match
  if (!stored.startsWith('$argon2')) {
    // Legacy bcrypt — use dynamic import to avoid dependency
    const { default: bcrypt } = await import('bcryptjs').catch(() => ({ default: null }));
    if (!bcrypt) return false;
    const valid = await bcrypt.compare(password, stored);
    if (valid) {
      config.admin_password = await argon2.hash(password);
      saveConfig(config);
    }
    return valid;
  }

  return argon2.verify(stored, password);
}

export function authMiddleware(req, res, next) {
  const password = req.body?.password;
  if (!password) return res.status(401).json({ error: 'Contraseña requerida' });
  authCheck(password).then(valid => {
    if (!valid) return res.status(401).json({ error: 'Contraseña incorrecta' });
    next();
  }).catch(() => res.status(500).json({ error: 'Error de autenticación' }));
}
