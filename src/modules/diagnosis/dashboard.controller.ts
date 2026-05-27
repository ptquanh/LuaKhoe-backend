import { HttpResponse } from 'mvc-common-toolkit';

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '@shared/decorators/roles.decorator';
import { ROLE } from '@shared/enums';
import { AuthGuard } from '@shared/guards/auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';

import { DashboardService } from './services/dashboard.service';

@ApiTags('Admin Dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(ROLE.ADMIN)
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Get admin dashboard stats and metrics (Admin only)',
  })
  async getDashboardStats(): Promise<HttpResponse<any>> {
    return this.dashboardService.getStats();
  }
}
