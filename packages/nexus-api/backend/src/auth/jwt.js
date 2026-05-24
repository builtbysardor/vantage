'use strict';

const jwt = require('jsonwebtoken');

const DEV_SECRET = 'nexus-pro-dev-secret-change-in-production';

function getSecret() {
  if (!process.env.JWT_SECRET) {
    console.warn('[auth] JWT_SECRET not set — using insecure dev secret');
    return DEV_SECRET;
  }
  return process.env.JWT_SECRET;
}

function signToken(payload) {
  return jwt.sign(payload, getSecret(), { expiresIn: '8h' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, getSecret());
  } catch {
    return null;
  }
}

module.exports = { signToken, verifyToken };
