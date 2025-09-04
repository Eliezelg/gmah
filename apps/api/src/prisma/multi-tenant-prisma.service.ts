import { Injectable, OnModuleDestroy, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import type { Request } from 'express';

// Cache for Prisma clients to avoid creating new connections for each request
const tenantClients = new Map<string, PrismaClient>();

@Injectable({ scope: Scope.REQUEST })
export class MultiTenantPrismaService implements OnModuleDestroy {
  private prisma: PrismaClient;

  constructor(@Inject(REQUEST) private request: Request) {
    const tenantId = this.request.tenantId || 'default';
    this.prisma = this.getPrismaClient(tenantId);
  }

  private getPrismaClient(tenantId: string): PrismaClient {
    // Check if we already have a client for this tenant
    if (tenantClients.has(tenantId)) {
      return tenantClients.get(tenantId)!;
    }

    // Create new Prisma client for this tenant
    const databaseUrl = this.buildDatabaseUrl(tenantId);
    
    const prismaClient = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
    });

    // Store in cache
    tenantClients.set(tenantId, prismaClient);

    // Connect to the database
    prismaClient.$connect()
      .then(() => {
        console.log(`[MultiTenantPrisma] Connected to database for tenant: ${tenantId}`);
      })
      .catch((error) => {
        console.error(`[MultiTenantPrisma] Failed to connect to database for tenant ${tenantId}:`, error);
        // Remove from cache if connection fails
        tenantClients.delete(tenantId);
        throw error;
      });

    return prismaClient;
  }

  private buildDatabaseUrl(tenantId: string): string {
    // Get base connection details from environment
    const baseUrl = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432';
    
    // Parse the base URL
    const url = new URL(baseUrl);
    
    // Build database name based on tenant (replace hyphens with underscores)
    const dbName = `gmah_org_${tenantId.replace(/-/g, '_')}`;
    
    // Reconstruct the URL with the tenant-specific database
    url.pathname = `/${dbName}`;
    
    return url.toString();
  }

  // Proxy all Prisma client properties and methods
  get user() { return this.prisma.user; }
  get profile() { return this.prisma.profile; }
  get session() { return this.prisma.session; }
  get loan() { return this.prisma.loan; }
  get guarantee() { return this.prisma.guarantee; }
  get payment() { return this.prisma.payment; }
  get repaymentSchedule() { return this.prisma.repaymentSchedule; }
  get contribution() { return this.prisma.contribution; }
  get campaign() { return this.prisma.campaign; }
  get document() { return this.prisma.document; }
  get notification() { return this.prisma.notification; }
  get approvalVote() { return this.prisma.approvalVote; }
  get auditLog() { return this.prisma.auditLog; }
  get systemConfig() { return this.prisma.systemConfig; }

  // Proxy transaction method
  $transaction(...args: Parameters<PrismaClient['$transaction']>) {
    return this.prisma.$transaction(...args);
  }

  // Proxy query methods
  $queryRaw(...args: Parameters<PrismaClient['$queryRaw']>) {
    return this.prisma.$queryRaw(...args);
  }

  $executeRaw(...args: Parameters<PrismaClient['$executeRaw']>) {
    return this.prisma.$executeRaw(...args);
  }

  // Proxy connect and disconnect
  $connect() {
    return this.prisma.$connect();
  }

  $disconnect() {
    return this.prisma.$disconnect();
  }

  // Clean up method for testing
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') return;
    
    const tenantId = this.request.tenantId || 'default';
    console.log(`[MultiTenantPrisma] Cleaning database for tenant: ${tenantId}`);
    
    // Delete all data in reverse order of dependencies
    await this.prisma.auditLog.deleteMany();
    await this.prisma.notification.deleteMany();
    await this.prisma.approvalVote.deleteMany();
    await this.prisma.document.deleteMany();
    await this.prisma.repaymentSchedule.deleteMany();
    await this.prisma.payment.deleteMany();
    await this.prisma.guarantee.deleteMany();
    await this.prisma.loan.deleteMany();
    await this.prisma.contribution.deleteMany();
    await this.prisma.campaign.deleteMany();
    await this.prisma.session.deleteMany();
    await this.prisma.profile.deleteMany();
    await this.prisma.user.deleteMany();
    await this.prisma.systemConfig.deleteMany();
  }

  async onModuleDestroy() {
    // Disconnect all tenant clients
    for (const [tenantId, client] of tenantClients) {
      console.log(`[MultiTenantPrisma] Disconnecting client for tenant: ${tenantId}`);
      await client.$disconnect();
    }
    tenantClients.clear();
  }
}

// Factory to provide the appropriate Prisma service based on configuration
@Injectable()
export class PrismaServiceFactory {
  static create(request?: Request): PrismaClient | MultiTenantPrismaService {
    const isMultiTenant = process.env.MULTI_TENANT_MODE === 'true';
    
    if (isMultiTenant && request) {
      return new MultiTenantPrismaService(request);
    }
    
    // Fall back to single tenant mode
    const defaultDb = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/gmah';
    return new PrismaClient({
      datasources: {
        db: { url: defaultDb }
      },
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
    });
  }
}