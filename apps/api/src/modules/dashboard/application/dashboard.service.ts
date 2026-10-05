import { Inject, Injectable } from '@nestjs/common';
import { DashboardRepository } from '../infrastructure/dashboard.repository.js';
@Injectable()
export class DashboardService {
  constructor(
    @Inject(DashboardRepository)
    private readonly repository: DashboardRepository,
  ) {}
  summary() {
    return this.repository.summary();
  }
}
