/**
 * src/utils/password.js
 *
 * Centralized password hashing (bcrypt) and password-strength
 * policy. Never touch/store plain-text passwords outside this
 * module's hash() boundary.
 */
const bcrypt = require("bcrypt");

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
const MIN_LENGTH = Number(process.env.PASSWORD_MIN_LENGTH || 10);

/**
 * Enforces a real password policy (length + character classes)
 * rather than just a minimum length, to resist dictionary and
 * credential-stuffing attacks.
 */
function validatePasswordStrength(password) {
  const errors = [];
  if (typeof password !== "string" || password.length < MIN_LENGTH) {
    errors.push(`Password must be at least ${MIN_LENGTH} characters long.`);
  }
  if (!/[a-z]/.test(password))
    errors.push("Password must include a lowercase letter.");
  if (!/[A-Z]/.test(password))
    errors.push("Password must include an uppercase letter.");
  if (!/[0-9]/.test(password)) errors.push("Password must include a number.");
  if (!/[^A-Za-z0-9]/.test(password))
    errors.push("Password must include a symbol.");

  // Reject a short list of the most common leaked passwords outright.
  const commonPasswords = [
    "password",
    "12345678",
    "qwerty123",
    "letmein123",
    "admin1234",
  ];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push("This password is too common. Choose something more unique.");
  }

  return { valid: errors.length === 0, errors };
}

async function hashPassword(plainText) {
  return bcrypt.hash(plainText, SALT_ROUNDS);
}

async function verifyPassword(plainText, hash) {
  return bcrypt.compare(plainText, hash);
}

module.exports = {
  validatePasswordStrength,
  hashPassword,
  verifyPassword,
  MIN_LENGTH,
};
