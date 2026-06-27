import type { MCPClients } from '../clients';

export async function fetchMarketplaceCatalog(clients: MCPClients) {
  const [categoryResponse, serverResponse] = await Promise.all([
    clients.app.mcp.listCategories(),
    clients.app.mcp.listServers(),
  ]);
  return {
    categories: categoryResponse.items,
    servers: serverResponse.items,
  };
}

export async function fetchServerDetail(clients: MCPClients, serverKey: string) {
  const serverResponse = await clients.app.mcp.getServer(serverKey);
  const server = serverResponse.data;
  const serverId = server.id;
  const [tools, resources, prompts] = await Promise.all([
    clients.app.mcp.listTools(serverId),
    clients.app.mcp.listResources(serverId),
    clients.app.mcp.listPrompts(serverId),
  ]);
  return {
    server,
    tools: tools.items,
    resources: resources.items,
    prompts: prompts.items,
  };
}

export async function fetchConsoleOverview(clients: MCPClients) {
  const [servers, invocations] = await Promise.all([
    clients.app.mcp.listServers(),
    clients.app.mcp.listInvocations(),
  ]);
  return {
    servers: servers.items,
    invocations: invocations.items.slice(0, 20),
  };
}
