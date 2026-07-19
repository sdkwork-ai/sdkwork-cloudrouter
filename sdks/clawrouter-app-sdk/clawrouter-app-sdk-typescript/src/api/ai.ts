import { appApiPath } from './paths';
import type { HttpClient } from '../http/client';

export class AiUsageLogsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List logs */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/ai/usage/logs`));
  }
}

export class AiUsageApi {
  private client: HttpClient;
  public readonly logs: AiUsageLogsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.logs = new AiUsageLogsApi(client);
  }

}

export class AiRoutingUsageApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List routing usage */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/ai/routing/usage`));
  }
}

export class AiRoutingRequestTracesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List routing request traces */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/ai/routing/request_traces`));
  }
}

export class AiRoutingChannelsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List routing channels */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/ai/routing/channels`));
  }
}

export class AiRoutingApiKeysApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List routing API keys */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/ai/routing/api_keys`));
  }
}

export class AiRoutingApi {
  private client: HttpClient;
  public readonly apiKeys: AiRoutingApiKeysApi;
  public readonly channels: AiRoutingChannelsApi;
  public readonly requestTraces: AiRoutingRequestTracesApi;
  public readonly usage: AiRoutingUsageApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.apiKeys = new AiRoutingApiKeysApi(client);
    this.channels = new AiRoutingChannelsApi(client);
    this.requestTraces = new AiRoutingRequestTracesApi(client);
    this.usage = new AiRoutingUsageApi(client);
  }

}

export class AiGenerationsWorkspaceApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List playground generation history from service */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/ai/generations/workspace`));
  }
}

export class AiGenerationsImagesTextToImageApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Run playground asset generation */
  async create(): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(appApiPath(`/ai/generations/images/text_to_image`));
  }
}

export class AiGenerationsImagesApi {
  private client: HttpClient;
  public readonly textToImage: AiGenerationsImagesTextToImageApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.textToImage = new AiGenerationsImagesTextToImageApi(client);
  }

}

export class AiGenerationsApi {
  private client: HttpClient;
  public readonly images: AiGenerationsImagesApi;
  public readonly workspace: AiGenerationsWorkspaceApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.images = new AiGenerationsImagesApi(client);
    this.workspace = new AiGenerationsWorkspaceApi(client);
  }


/** List generation history */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/ai/generations`));
  }
}

export class AiGatewayTracesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List traces */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/ai/gateway/traces`));
  }
}

export class AiGatewayApi {
  private client: HttpClient;
  public readonly traces: AiGatewayTracesApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.traces = new AiGatewayTracesApi(client);
  }

}

export class AiDashboardOverviewApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List dashboard overview */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/ai/dashboard/overview`));
  }
}

export class AiDashboardApi {
  private client: HttpClient;
  public readonly overview: AiDashboardOverviewApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.overview = new AiDashboardOverviewApi(client);
  }

}

export class AiChannelGroupsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List groups */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/ai/channel_groups`));
  }
}

export class AiApi {
  private client: HttpClient;
  public readonly channelGroups: AiChannelGroupsApi;
  public readonly dashboard: AiDashboardApi;
  public readonly gateway: AiGatewayApi;
  public readonly generations: AiGenerationsApi;
  public readonly routing: AiRoutingApi;
  public readonly usage: AiUsageApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.channelGroups = new AiChannelGroupsApi(client);
    this.dashboard = new AiDashboardApi(client);
    this.gateway = new AiGatewayApi(client);
    this.generations = new AiGenerationsApi(client);
    this.routing = new AiRoutingApi(client);
    this.usage = new AiUsageApi(client);
  }

}

export function createAiApi(client: HttpClient): AiApi {
  return new AiApi(client);
}

function appendQueryString(path: string, rawQueryString: string): string {
  const query = rawQueryString.replace(/^\?+/, '');
  if (!query) {
    return path;
  }
  return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}
