import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create Super Admin
  const superAdminEmail = 'admin@gmah.org';
  const superAdminPassword = 'Admin123!@#'; // Change this in production!

  // Check if super admin already exists
  const existingSuperAdmin = await prisma.user.findUnique({
    where: { email: superAdminEmail },
  });

  if (existingSuperAdmin) {
    console.log('✅ Super Admin already exists');
  } else {
    // Hash the password
    const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

    // Create the super admin user
    const superAdmin = await prisma.user.create({
      data: {
        email: superAdminEmail,
        passwordHash: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        phone: '+972501234567',
        address: '1 Admin Street',
        city: 'Jerusalem',
        postalCode: '9100000',
        country: 'Israel',
        role: 'SUPER_ADMIN',
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
        twoFactorEnabled: false,
        profile: {
          create: {
            occupation: 'System Administrator',
            communityMemberSince: new Date(),
            synagogue: 'Main Synagogue',
          },
        },
      },
      include: {
        profile: true,
      },
    });

    console.log('✅ Super Admin created successfully');
    console.log('📧 Email:', superAdmin.email);
    console.log('🔑 Password:', superAdminPassword);
    console.log('⚠️  IMPORTANT: Change this password immediately in production!');
  }

  // Create additional seed data if needed
  console.log('🌱 Seeding completed successfully');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });