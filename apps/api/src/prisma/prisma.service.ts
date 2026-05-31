import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    // Do NOT throw on a failed connection at boot. On serverless (Vercel) a
    // throw here crashes the whole function (FUNCTION_INVOCATION_FAILED) so even
    // the health check 500s. Instead log and let the app boot; queries that need
    // the DB will surface their own errors, and /health can report db: "down".
    try {
      await this.$connect();
    } catch (err) {
      this.logger.error(
        `Database connection failed at startup: ${(err as Error).message}. ` +
          'Check DATABASE_URL. The API will start but DB-backed routes will fail.',
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect().catch(() => undefined);
  }
}
