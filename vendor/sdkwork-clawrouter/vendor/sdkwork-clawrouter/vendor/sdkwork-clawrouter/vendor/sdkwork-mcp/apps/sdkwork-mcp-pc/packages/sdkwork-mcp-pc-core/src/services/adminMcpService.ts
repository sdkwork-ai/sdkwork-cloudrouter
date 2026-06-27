import type {
  AppendMcpInvocationCommand,
  CreateMcpServerCommand,
  UpdateMcpServerCommand,
  UpsertMcpConnectorCommand,
  UpsertMcpPromptCommand,
  UpsertMcpResourceCommand,
  UpsertMcpServerCategoryCommand,
  UpsertMcpToolCommand,
} from 'sdkwork-mcp-backend-sdk-generated-typescript/src/types';

import type { MCPClients } from '../clients';

export async function listAdminCategories(clients: MCPClients) {
  const response = await clients.backend.mcp.mcpAdmin.listCategories();
  return response.items;
}

export async function upsertAdminCategory(
  clients: MCPClients,
  command: UpsertMcpServerCategoryCommand,
) {
  const response = await clients.backend.mcp.mcpAdmin.upsertCategory(command);
  return response.data;
}

export async function listAdminServers(clients: MCPClients) {
  const response = await clients.backend.mcp.mcpAdmin.listServers();
  return response.items;
}

export async function createAdminServer(clients: MCPClients, command: CreateMcpServerCommand) {
  const response = await clients.backend.mcp.mcpAdmin.createServer(command);
  return response.data;
}

export async function updateAdminServer(
  clients: MCPClients,
  serverKey: string,
  command: UpdateMcpServerCommand,
) {
  const response = await clients.backend.mcp.mcpAdmin.updateServer(serverKey, command);
  return response.data;
}

export async function deleteAdminServer(clients: MCPClients, serverKey: string) {
  const response = await clients.backend.mcp.mcpAdmin.deleteServer(serverKey);
  return response.data;
}

export async function listAdminConnectors(clients: MCPClients, serverId: string) {
  const response = await clients.backend.mcp.mcpAdmin.listConnectors(serverId);
  return response.items;
}

export async function upsertAdminConnector(
  clients: MCPClients,
  serverId: string,
  command: UpsertMcpConnectorCommand,
) {
  const response = await clients.backend.mcp.mcpAdmin.upsertConnector(serverId, command);
  return response.items;
}

export async function deleteAdminConnector(
  clients: MCPClients,
  serverId: string,
  connectorKey: string,
) {
  const response = await clients.backend.mcp.mcpAdmin.deleteConnector(serverId, connectorKey);
  return response.items;
}

export async function upsertAdminTool(
  clients: MCPClients,
  serverId: string,
  command: UpsertMcpToolCommand,
) {
  const response = await clients.backend.mcp.mcpAdmin.upsertTool(serverId, command);
  return response.items;
}

export async function upsertAdminResource(
  clients: MCPClients,
  serverId: string,
  command: UpsertMcpResourceCommand,
) {
  const response = await clients.backend.mcp.mcpAdmin.upsertResource(serverId, command);
  return response.items;
}

export async function upsertAdminPrompt(
  clients: MCPClients,
  serverId: string,
  command: UpsertMcpPromptCommand,
) {
  const response = await clients.backend.mcp.mcpAdmin.upsertPrompt(serverId, command);
  return response.items;
}

export async function listAdminInvocations(clients: MCPClients) {
  const response = await clients.backend.mcp.mcpAdmin.listInvocations();
  return response.items;
}

export async function appendAdminInvocation(
  clients: MCPClients,
  command: AppendMcpInvocationCommand,
) {
  const response = await clients.backend.mcp.mcpAdmin.appendInvocation(command);
  return response.data;
}
