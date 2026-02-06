const jwt = require('jsonwebtoken');
const db = require('../db/connection');

/**
 * Middleware to verify JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: { message: 'No token provided' } });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from database
      const user = await db('users')
        .where({ id: decoded.userId, is_active: true })
        .first();

      if (!user) {
        return res.status(401).json({ error: { message: 'User not found or inactive' } });
      }

      // Attach user to request
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      };

      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ error: { message: 'Token expired' } });
      }
      return res.status(401).json({ error: { message: 'Invalid token' } });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: { message: 'Authentication error' } });
  }
};

/**
 * Middleware to check user role
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: { message: 'Not authenticated' } });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: { message: 'Insufficient permissions' } });
    }

    next();
  };
};

/**
 * Middleware to verify GPS device API key
 */
const authenticateGpsDevice = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== process.env.GPS_API_KEY) {
    return res.status(401).json({ error: { message: 'Invalid API key' } });
  }

  next();
};

module.exports = {
  authenticate,
  authorize,
  authenticateGpsDevice
};
