const VALID_ROLES = ['User', 'Guide', 'Curator', 'Administrator'];
const GUIDE_WORKSPACE_ROLES = ['Guide', 'Curator', 'Administrator'];
const EDITORIAL_ROLES = ['Curator', 'Administrator'];

const normalizeUserRole = (value) => {
  const normalized = String(value || '').trim();
  return VALID_ROLES.includes(normalized) ? normalized : 'User';
};

const hasAnyRole = (user, allowedRoles = []) => allowedRoles.includes(normalizeUserRole(user?.role));

module.exports = {
  EDITORIAL_ROLES,
  GUIDE_WORKSPACE_ROLES,
  VALID_ROLES,
  normalizeUserRole,
  hasAnyRole
};
