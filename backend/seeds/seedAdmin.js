import mongoose from 'mongoose';
import User from '../models/User.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function seedAdmin() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const adminExists = await User.findOne({ role: 'ADMIN' });

    if (adminExists) {
      console.log('');
      console.log('ℹ️  Admin user already exists!');
      console.log('   Username:', adminExists.username);
      console.log('   Email:', adminExists.email);
      console.log('');
      console.log('⚠️  Do not run this script twice!');
      console.log('');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Create admin user
    const admin = new User({
      username: 'admin',
      email: 'admin@trainersync.com',
      password: 'Admin@12345', // Will be hashed automatically
      role: 'ADMIN', // Explicitly set ADMIN role
      profile: {
        firstName: 'System',
        lastName: 'Administrator',
        phone: '+91-9000000000',
        employeeId: 'ADMIN-001',
        joiningDate: new Date(),
      },
      status: 'ACTIVE',
    });

    await admin.save();

    console.log('');
    console.log('╔════════════════════════════════════════════╗');
    console.log('║  ✅ ADMIN USER CREATED SUCCESSFULLY       ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log('');
    console.log('📝 Login Credentials:');
    console.log('   Username: admin');
    console.log('   Email: admin@trainersync.com');
    console.log('   Password: Admin@12345');
    console.log('');
    console.log('⚠️  IMPORTANT:');
    console.log('   1. Change password after first login');
    console.log('   2. Do NOT share these credentials');
    console.log('   3. Use for system administration only');
    console.log('');

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seedAdmin();