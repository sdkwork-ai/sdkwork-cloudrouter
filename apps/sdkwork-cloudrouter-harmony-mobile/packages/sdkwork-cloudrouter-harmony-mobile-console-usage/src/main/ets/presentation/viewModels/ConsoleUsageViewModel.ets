import { ConsoleUsageService } from '../../services/ConsoleUsageService';
import { type ConsoleUsageScreenModel } from '../../models/ConsoleUsageModels';

/**
 * console-usage view model. Owns UI state mapping; calls services only.
 */
export class ConsoleUsageViewModel {
  private readonly service: ConsoleUsageService;
  private model: ConsoleUsageScreenModel = {
      "items": [],
      "total": 0,
      "loading": false,
      "hasMore": false
  };

  constructor(service: ConsoleUsageService) {
    this.service = service;
  }

  state(): ConsoleUsageScreenModel {
    return this.model;
  }

  async load(page: number, pageSize: number): Promise<ConsoleUsageScreenModel> {
    this.model = { items: this.model.items, total: this.model.total, loading: true, hasMore: false };
    try {
      const pageResult = await this.service.listUsagePage(page, pageSize);
      this.model = {
        items: pageResult.items,
        total: pageResult.total,
        loading: false,
        hasMore: pageResult.items.length >= pageSize,
      };
    } catch (error) {
      this.model = {
        items: [],
        total: 0,
        loading: false,
        hasMore: false,
        errorMessage: error instanceof Error ? error.message : 'unknown-error',
      };
    }
    return this.model;
  }
}
