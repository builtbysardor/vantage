'use strict';

const bcrypt = require('bcryptjs');

const DEFAULT_HASH = bcrypt.hashSync('admin123', 10);

function validateUser(username, password) {
  const expectedUsername = process.env.ADMIN_USERNAME || 'admin';
  const expectedHash     = process.env.ADMIN_PASSWORD_HASH || DEFAULT_HASH;

  if (!process.env.ADMIN_PASSWORD_HASH) {
    console.warn('[auth] ADMIN_PASSWORD_HASH not set — using default dev password (admin123)');
  }

  if (username !== expectedUsername) return false;
  return bcrypt.compareSync(password, expectedHash);
}

module.exports = { validateUser };
