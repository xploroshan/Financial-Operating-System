import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { computeEarlyWarning } from '@lcos/core';
import { FinancialSnapshotService } from '../common/financial-snapshot.service';
import { AuthUser, CurrentUser } from '../common/decorators';

@Injectable()
class InsightsService {
  constructor(private readonly snapshots: FinancialSnapshotService) {}

  /** Assemble the Wealth Early Warning report from the user's real data. */
  async earlyWarning(userId: string) {
    const snapshot = await this.snapshots.assemble(userId);
    return computeEarlyWarning(FinancialSnapshotService.toEarlyWarningInput(snapshot));
  }
}

@ApiTags('insights')
@Controller('insights')
class InsightsController {
  constructor(private readonly insights: InsightsService) {}

  @Get('early-warning')
  earlyWarning(@CurrentUser() user: AuthUser) {
    return this.insights.earlyWarning(user.id);
  }
}

@Module({
  controllers: [InsightsController],
  providers: [InsightsService],
})
export class InsightsModule {}
