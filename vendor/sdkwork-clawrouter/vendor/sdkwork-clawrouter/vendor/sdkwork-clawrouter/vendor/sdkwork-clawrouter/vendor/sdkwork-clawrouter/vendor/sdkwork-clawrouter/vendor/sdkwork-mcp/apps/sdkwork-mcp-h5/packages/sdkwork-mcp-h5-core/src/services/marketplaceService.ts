import { getMCPAppSdkClientWithSession } from '../sdk/mcpAppSdkClient';

export async function fetchMarketplaceCatalog() {
  const client = getMCPAppSdkClientWithSession();
  const [categoryResponse, serverResponse] = await Promise.all([
    client.mcp.listCategories(),
    client.mcp.listServers(),
  ]);
  return {
    categories: categoryResponse.items,
    servers: serverResponse.items,
  };
}

export async function fetchServerDetail(serverKey: string) {
  const client = getMCPAppSdkClientWithSession();
  const serverResponse = await client.mcp.getServer(serverKey);
  const server = serverResponse.data;
  const serverId = server.id;
  const [tools, resources, prompts] = await Promise.all([
    client.mcp.listTools(serverId),
    client.mcp.listResources(serverId),
    client.mcp.listPrompts(serverId),
  ]);
  return {
    server,
    tools: tools.items,
    resources: resources.items,
    prompts: prompts.items,
  };
}
