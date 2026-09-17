import { ConsoleCatalogService } from '../../services/ConsoleCatalogService';
import { type ConsoleCatalogScreenModel } from '../../models/ConsoleCatalogModels';

/**
 * console-catalog view model. Owns UI state mapping; calls services only.
 */
export class ConsoleCatalogViewModel {
  private readonly service: ConsoleCatalogService;
  private model: ConsoleCatalogScreenModel = {
      "items": [],
      "total": 0,
      "loading": false,
      "hasMore": false
  };

  constructor(service: ConsoleCatalogService) {
    this.service = service;
  }

  state(): ConsoleCatalogScreenModel {
    return this.model;
  }

  async load(page: number, pageSize: number): Promise<ConsoleCatalogScreenModel> {
    this.model = { items: this.model.items, total: this.model.total, loading: true, hasMore: false };
    try {
      const pageResult = await this.service.listCatalogPage(page, pageSize);
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
