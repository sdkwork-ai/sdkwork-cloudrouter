import { createContext, useContext, type ReactNode } from 'react';

import { createMCPClients, type MCPClients } from './clients';

const MCPClientsContext = createContext<MCPClients | null>(null);

export function MCPClientsProvider({
  clients,
  children,
}: {
  clients?: MCPClients;
  children: ReactNode;
}) {
  const value = clients ?? createMCPClients();
  return <MCPClientsContext.Provider value={value}>{children}</MCPClientsContext.Provider>;
}

export function useMCPClients(): MCPClients {
  const clients = useContext(MCPClientsContext);
  if (!clients) {
    throw new Error('useMCPClients must be used within MCPClientsProvider');
  }
  return clients;
}
