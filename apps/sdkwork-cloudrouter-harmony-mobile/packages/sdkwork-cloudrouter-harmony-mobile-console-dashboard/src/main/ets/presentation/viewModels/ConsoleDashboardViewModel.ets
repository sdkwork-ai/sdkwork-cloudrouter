import { ConsoleDashboardService } from '../../services/ConsoleDashboardService';
import { type ConsoleDashboardScreenModel } from '../../models/ConsoleDashboardModels';

/**
 * console-dashboard view model. Owns UI state mapping; calls services only.
 */
export class ConsoleDashboardViewModel {
  private readonly service: ConsoleDashboardService;
  private model: ConsoleDashboardScreenModel = {
      "overview": null,
      "loading": false
  };

  constructor(service: ConsoleDashboardService) {
    this.service = service;
  }

  state(): ConsoleDashboardScreenModel {
    return this.model;
  }

  async load(page: number, pageSize: number): Promise<ConsoleDashboardScreenModel> {
    this.model = { overview: this.model.overview, loading: true };
    try {
      const overview = await this.service.loadOverview();
      this.model = { overview, loading: false };
    } catch (error) {
      this.model = {
        overview: null,
        loading: false,
        errorMessage: error instanceof Error ? error.message : 'unknown-error',
      };
    }
    return this.model;
  }
}
