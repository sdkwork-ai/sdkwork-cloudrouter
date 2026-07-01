import { appApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { DashboardOverviewRetrieveResult, SdkWorkPageData } from '../types';


export class AiUsageLogsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/ai/usage/logs`));
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


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/ai/routing/usage`));
  }
}

export class AiRoutingRequestTracesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/ai/routing/request_traces`));
  }
}

export class AiRoutingChannelsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/ai/routing/channels`));
  }
}

export class AiRoutingApiKeysApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/ai/routing/api_keys`));
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

export class AiModelsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/ai/models`));
  }
}

export class AiModelVendorsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/ai/model_vendors`));
  }
}

export class AiModelRankingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/ai/model_rankings`));
  }
}

export class AiGatewayTracesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/ai/gateway/traces`));
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


/** Retrieve */
  async retrieve(): Promise<DashboardOverviewRetrieveResult> {
    return this.client.get<DashboardOverviewRetrieveResult>(appApiPath(`/ai/dashboard/overview`));
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


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/ai/channel_groups`));
  }
}

export class AiApi {
  private client: HttpClient;
  public readonly channelGroups: AiChannelGroupsApi;
  public readonly dashboard: AiDashboardApi;
  public readonly gateway: AiGatewayApi;
  public readonly modelRankings: AiModelRankingsApi;
  public readonly modelVendors: AiModelVendorsApi;
  public readonly models: AiModelsApi;
  public readonly routing: AiRoutingApi;
  public readonly usage: AiUsageApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.channelGroups = new AiChannelGroupsApi(client);
    this.dashboard = new AiDashboardApi(client);
    this.gateway = new AiGatewayApi(client);
    this.modelRankings = new AiModelRankingsApi(client);
    this.modelVendors = new AiModelVendorsApi(client);
    this.models = new AiModelsApi(client);
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
