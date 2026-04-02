const jwt = require('jsonwebtoken');
const { getDb } = require('../storage/fileDb');
const { EDITORIAL_ROLES, GUIDE_WORKSPACE_ROLES, hasAnyRole, normalizeUserRole } = require('../services/roles');

const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

const requireRoles =
  (allowedRoles = [], options = {}) =>
  async (req, res, next) => {
    try {
      const db = await getDb();
      const user = db.users.find((item) => item._id === req.user.id);

      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }

      const normalizedUser = {
        ...user,
        role: normalizeUserRole(user.role)
      };

      if (!hasAnyRole(normalizedUser, allowedRoles)) {
        return res.status(403).json({ msg: options.message || 'Access denied' });
      }

      req.accessUser = normalizedUser;

      if (options.requestKey) {
        req[options.requestKey] = normalizedUser;
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(500).json({ msg: options.failureMessage || 'Failed to validate access' });
    }
  };

const requireAdmin = requireRoles(['Administrator'], {
  requestKey: 'adminUser',
  message: 'Administrator access required',
  failureMessage: 'Failed to validate administrator access'
});

const requireEditorialRole = requireRoles(EDITORIAL_ROLES, {
  requestKey: 'editorialUser',
  message: 'Editorial access required',
  failureMessage: 'Failed to validate editorial access'
});

const requireGuideWorkspaceAccess = requireRoles(GUIDE_WORKSPACE_ROLES, {
  requestKey: 'guideUser',
  message: 'Guide workspace access required',
  failureMessage: 'Failed to validate guide workspace access'
});

module.exports = auth;
module.exports.requireRoles = requireRoles;
module.exports.requireAdmin = requireAdmin;
module.exports.requireEditorialRole = requireEditorialRole;
module.exports.requireGuideWorkspaceAccess = requireGuideWorkspaceAccess;
