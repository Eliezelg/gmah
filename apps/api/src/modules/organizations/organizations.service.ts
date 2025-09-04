import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../../email/email.service';

const execAsync = promisify(exec);

@Injectable()
export class OrganizationsService {
  private masterPrisma: PrismaClient;

  constructor(private readonly emailService: EmailService) {
    // Initialize master database connection
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '5432';
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPassword = process.env.DB_PASSWORD || 'postgres';
    const masterDb = process.env.MASTER_DB || 'gmah_master';
    const masterDbUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${masterDb}`;
    
    this.masterPrisma = new PrismaClient({
      datasources: {
        db: { url: masterDbUrl }
      }
    });
  }

  async createOrganization(dto: CreateOrganizationDto) {
    // Validate slug availability
    const slugAvailable = await this.checkSlugAvailability(dto.slug);
    if (!slugAvailable) {
      throw new ConflictException('This identifier is already taken');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(dto.adminEmail)) {
      throw new BadRequestException('Invalid email format');
    }

    try {
      // 1. Create database for the organization
      const dbName = `gmah_org_${dto.slug.replace(/-/g, '_')}`;
      await this.createDatabase(dbName);

      // 2. Run Prisma migrations
      await this.runMigrations(dbName);

      // 3. Seed initial data
      const adminPassword = await this.seedInitialData(dbName, dto);

      // 4. Register organization in master database
      const organization = await this.registerOrganization(dto, dbName);

      // 5. Send welcome email
      await this.sendWelcomeEmail(dto, adminPassword);

      return {
        success: true,
        message: 'Organization created successfully',
        organization: {
          slug: organization.slug,
          name: organization.name,
          domain: organization.domain,
          adminEmail: dto.adminEmail
        }
      };
    } catch (error) {
      console.error('Error creating organization:', error);
      throw new BadRequestException(`Failed to create organization: ${error.message}`);
    }
  }

  async checkSlugAvailability(slug: string): Promise<boolean> {
    // Validate slug format
    const slugRegex = /^[a-z][a-z0-9-]*[a-z0-9]$/;
    if (!slugRegex.test(slug)) {
      return false;
    }

    try {
      // Check in master database
      const existing = await this.masterPrisma.$queryRaw`
        SELECT 1 FROM organizations WHERE slug = ${slug} LIMIT 1
      `;
      return !existing || (Array.isArray(existing) && existing.length === 0);
    } catch (error) {
      // If master database doesn't exist yet, slug is available
      return true;
    }
  }

  async getOrganization(slug: string) {
    try {
      const organization = await this.masterPrisma.$queryRaw`
        SELECT * FROM organizations WHERE slug = ${slug}
      `;
      
      if (!organization || (Array.isArray(organization) && organization.length === 0)) {
        throw new BadRequestException('Organization not found');
      }

      return Array.isArray(organization) ? organization[0] : organization;
    } catch (error) {
      throw new BadRequestException('Failed to fetch organization');
    }
  }

  async listOrganizations() {
    try {
      const organizations = await this.masterPrisma.$queryRaw`
        SELECT 
          id, slug, name, domain, status, plan, 
          created_at, updated_at, admin_email
        FROM organizations 
        ORDER BY created_at DESC
      `;
      
      return organizations;
    } catch (error) {
      throw new BadRequestException('Failed to fetch organizations');
    }
  }

  private async createDatabase(dbName: string) {
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || '5432',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres'
    };

    const command = `PGPASSWORD=${dbConfig.password} psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -c "CREATE DATABASE ${dbName};"`;
    
    try {
      await execAsync(command);
    } catch (error) {
      if (error.message.includes('already exists')) {
        throw new ConflictException('Database already exists for this organization');
      }
      throw error;
    }
  }

  private async runMigrations(dbName: string) {
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '5432';
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPassword = process.env.DB_PASSWORD || 'postgres';
    const dbUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;
    const command = `DATABASE_URL="${dbUrl}" npx prisma migrate deploy`;
    
    await execAsync(command);
  }

  private async seedInitialData(dbName: string, dto: CreateOrganizationDto): Promise<string> {
    // Generate temporary password
    const tempPassword = this.generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create Prisma client for the new database
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '5432';
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPassword = process.env.DB_PASSWORD || 'postgres';
    const dbUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;
    
    const tenantPrisma = new PrismaClient({
      datasources: {
        db: { url: dbUrl }
      }
    });

    try {
      // Create admin user
      await tenantPrisma.user.create({
        data: {
          email: dto.adminEmail,
          passwordHash: hashedPassword,
          firstName: dto.adminName.split(' ')[0] || 'Admin',
          lastName: dto.adminName.split(' ').slice(1).join(' ') || 'User',
          phone: dto.phoneNumber || '',
          role: 'ADMIN',
          isActive: true,
          profile: {
            create: {}
          }
        }
      });

      // Create system configuration
      await tenantPrisma.systemConfig.create({
        data: {
          key: 'organization_settings',
          value: JSON.stringify({
            loanCategories: [
              { name: 'Personnel', description: 'Prêt pour besoins personnels', maxAmount: 5000, maxDuration: 12 },
              { name: 'Urgence', description: 'Prêt d\'urgence médicale ou familiale', maxAmount: 3000, maxDuration: 6 },
              { name: 'Études', description: 'Prêt pour frais de scolarité', maxAmount: 10000, maxDuration: 24 },
              { name: 'Mariage', description: 'Prêt pour célébration de mariage', maxAmount: 15000, maxDuration: 36 },
              { name: 'Professionnel', description: 'Prêt pour activité professionnelle', maxAmount: 20000, maxDuration: 48 }
            ],
            treasury: {
              balance: 0,
              availableFunds: 0,
              committedFunds: 0
            }
          }),
          description: 'Organization initial settings'
        }
      });

      return tempPassword;
    } finally {
      await tenantPrisma.$disconnect();
    }
  }

  private async registerOrganization(dto: CreateOrganizationDto, dbName: string) {
    // Ensure master database and table exist
    await this.ensureMasterDatabase();

    // Create organization record
    const organization = await this.masterPrisma.$queryRaw`
      INSERT INTO organizations (
        slug, name, domain, database_name, admin_email, admin_name,
        phone_number, address, city, postal_code, country,
        status, settings, limits
      ) VALUES (
        ${dto.slug},
        ${dto.organizationName},
        ${dto.slug + '.gmah.com'},
        ${dbName},
        ${dto.adminEmail},
        ${dto.adminName},
        ${dto.phoneNumber || null},
        ${dto.address},
        ${dto.city},
        ${dto.postalCode},
        ${dto.country},
        'ACTIVE',
        ${'{}'}::jsonb,
        ${'{"maxUsers": 100, "maxLoans": 1000}'}::jsonb
      )
      RETURNING *
    `;

    return Array.isArray(organization) ? organization[0] : organization;
  }

  private async ensureMasterDatabase() {
    try {
      // Check if organizations table exists
      await this.masterPrisma.$queryRaw`SELECT 1 FROM organizations LIMIT 1`;
    } catch (error) {
      // Create table if it doesn't exist
      await this.masterPrisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS organizations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          slug VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(200) NOT NULL,
          domain VARCHAR(200) UNIQUE,
          database_name VARCHAR(100) NOT NULL,
          status VARCHAR(20) DEFAULT 'ACTIVE',
          settings JSONB DEFAULT '{}',
          limits JSONB DEFAULT '{}',
          admin_email VARCHAR(200),
          admin_name VARCHAR(200),
          phone_number VARCHAR(20),
          address TEXT,
          city VARCHAR(100),
          postal_code VARCHAR(20),
          country VARCHAR(100),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
    }
  }

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  private async sendWelcomeEmail(dto: CreateOrganizationDto, tempPassword: string) {
    const domain = `${dto.slug}.gmah.com`;
    
    const emailContent = `
      <h2>Bienvenue sur GMAH Platform !</h2>
      <p>Bonjour ${dto.adminName},</p>
      <p>Votre espace GMAH a été créé avec succès.</p>
      <h3>Informations de connexion :</h3>
      <ul>
        <li><strong>URL :</strong> <a href="https://${domain}">https://${domain}</a></li>
        <li><strong>Email :</strong> ${dto.adminEmail}</li>
        <li><strong>Mot de passe temporaire :</strong> ${tempPassword}</li>
      </ul>
      <p><strong>Important :</strong> Veuillez changer votre mot de passe dès votre première connexion.</p>
      <h3>Prochaines étapes :</h3>
      <ol>
        <li>Connectez-vous à votre espace</li>
        <li>Changez votre mot de passe</li>
        <li>Configurez les paramètres de votre organisation</li>
        <li>Invitez vos collaborateurs</li>
      </ol>
      <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
      <p>Cordialement,<br>L'équipe GMAH Platform</p>
    `;

    try {
      await this.emailService.sendEmail({
        to: dto.adminEmail,
        subject: 'Bienvenue sur GMAH Platform',
        html: emailContent
      });
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Don't throw - email failure shouldn't block organization creation
    }
  }

  async onModuleDestroy() {
    await this.masterPrisma.$disconnect();
  }
}