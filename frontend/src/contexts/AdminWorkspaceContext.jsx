import { createContext, useContext } from 'react';

export const DEFAULT_ADMIN_WORKSPACE_METADATA = {
  eyebrow: 'Рабочее пространство',
  title: 'Admin Home',
  description: 'Быстрый вход в маршруты, подборки и последние задачи редактора.',
  stats: [],
  actions: []
};

const noop = () => {};

const AdminWorkspaceContext = createContext({
  metadata: DEFAULT_ADMIN_WORKSPACE_METADATA,
  setMetadata: noop,
  resetMetadata: noop
});

export const useAdminWorkspace = () => useContext(AdminWorkspaceContext);

export default AdminWorkspaceContext;
