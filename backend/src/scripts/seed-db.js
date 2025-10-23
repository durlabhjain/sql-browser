#!/usr/bin/env node
import { UserModel } from '../models/User.js';
import logger from '../config/logger.js';
import { ROLES } from '../config/roles.js';

async function seedDatabase() {
  logger.info('Seeding database...');

  try {
    // Check if admin user already exists
    const existingAdmin = await UserModel.findByUsername('admin');

    if (existingAdmin) {
      logger.info('Admin user already exists. Skipping seed.');
      return;
    }

    // Create default admin user
    const adminUser = await UserModel.create({
      username: 'admin',
      password: 'Admin123!',
      email: 'admin@example.com',
      role: ROLES.ADMIN,
      isActive: true
    });

    logger.info(`✓ Admin user created: ${adminUser.username}`);
    logger.info('  Username: admin');
    logger.info('  Password: Admin123!');
    logger.info('  ⚠️  IMPORTANT: Change the admin password immediately after first login!');

    // Create sample users (optional)
    const viewerUser = await UserModel.create({
      username: 'viewer',
      password: 'Viewer123!',
      email: 'viewer@example.com',
      role: ROLES.VIEWER,
      isActive: true
    });
    logger.info(`✓ Viewer user created: ${viewerUser.username}`);

    const analystUser = await UserModel.create({
      username: 'analyst',
      password: 'Analyst123!',
      email: 'analyst@example.com',
      role: ROLES.ANALYST,
      isActive: true
    });
    logger.info(`✓ Analyst user created: ${analystUser.username}`);

    logger.info('\nDatabase seeded successfully!');
    logger.info('\nDefault credentials:');
    logger.info('  Admin    - username: admin,    password: Admin123!');
    logger.info('  Analyst  - username: analyst,  password: Analyst123!');
    logger.info('  Viewer   - username: viewer,   password: Viewer123!');
    logger.info('\n⚠️  SECURITY: Change all default passwords before deploying to production!\n');

  } catch (error) {
    logger.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
