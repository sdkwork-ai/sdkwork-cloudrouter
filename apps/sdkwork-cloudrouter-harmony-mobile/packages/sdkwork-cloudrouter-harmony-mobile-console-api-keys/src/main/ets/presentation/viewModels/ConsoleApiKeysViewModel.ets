import { ConsoleApiKeysService } from '../../services/ConsoleApiKeysService';
import { type ConsoleApiKeysScreenModel } from '../../models/ConsoleApiKeysModels';

/**
 * console-api-keys view model. Owns UI state mapping; calls services only.
 */
export class ConsoleApiKeysViewModel {
  private readonly service: ConsoleApiKeysService;
  private model: ConsoleApiKeysScreenModel = {
      "rows": [],
      "createdSecret": null,
      "loading": false
  };

  constructor(service: ConsoleApiKeysService) {
    this.service = service;
  }

  state(): ConsoleApiKeysScreenModel {
    return this.model;
  }

  async load(page: number, pageSize: number): Promise<ConsoleApiKeysScreenModel> {
    this.model = { rows: this.model.rows, createdSecret: null, loading: true };
    try {
      const rows = await this.service.listApiKeys();
      this.model = { rows, createdSecret: null, loading: false };
    } catch (error) {
      this.model = {
        rows: [],
        createdSecret: null,
        loading: false,
        errorMessage: error instanceof Error ? error.message : 'unknown-error',
      };
    }
    return this.model;
  }
}
