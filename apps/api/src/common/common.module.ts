import { Global, Module } from '@nestjs/common';
import { CryptoService } from './crypto.service';
import { AuditService } from './audit.service';
import { FinancialSnapshotService } from './financial-snapshot.service';

@Global()
@Module({
  providers: [CryptoService, AuditService, FinancialSnapshotService],
  exports: [CryptoService, AuditService, FinancialSnapshotService],
})
export class CommonModule {}
