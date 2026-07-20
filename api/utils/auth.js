const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required.');
}

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, machine_id: user.machine_id },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};

module.exports = { generateToken, verifyToken };
