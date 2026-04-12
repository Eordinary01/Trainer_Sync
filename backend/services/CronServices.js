// services/CronService.js
import cron from 'node-cron';
import { LeaveService } from '../services/LeaveService.js';
import axios from 'axios';
import { log } from 'node:console';

export class CronService {
  constructor() {
    this.leaveService = new LeaveService();
    this.healthCheckJob = null;
  }

  // ============================================
  // ✅ SETUP ALL CRON JOBS
  // ============================================
  setupCronJobs() {
    console.log('⏰ Setting up automated leave management cron jobs...');

    // 1. Daily at 2:00 AM - Check and increment monthly leaves
    cron.schedule('0 2 * * *', async () => {
      console.log('🔄 Running daily leave increment check...');
      try {
        const result = await this.leaveService.autoIncrementMonthlyLeaves();
        console.log('✅ Daily leave increment completed:', result);
      } catch (error) {
        console.error('❌ Daily leave increment failed:', error);
      }
    });

    // 2. Monthly on 1st at 3:00 AM - Year-end rollover check
    cron.schedule('0 3 1 * *', async () => {
      console.log('🔄 Running monthly year-end rollover check...');
      try {
        const result = await this.leaveService.autoYearEndRollover();
        console.log('✅ Monthly rollover check completed:', result);
      } catch (error) {
        console.error('❌ Monthly rollover check failed:', error);
      }
    });

    // 3. Weekly report on Monday at 9:00 AM
    cron.schedule('0 9 * * 1', async () => {
      console.log('📊 Running weekly leave balance report...');
      try {
        await this.generateWeeklyReport();
      } catch (error) {
        console.error('❌ Weekly report failed:', error);
      }
    });

    console.log('✅ Cron jobs setup completed');
    
    
    this.setupHealthCheckJob();
    log('✅ Health check cron job setup completed');
  }


// HEALTH CHECKUP 
  setupHealthCheckJob() {
    // Only run in production or if explicitly enabled
    const isProduction = process.env.NODE_ENV === 'production';
    const isEnabled = process.env.ENABLE_HEALTH_CRON === 'true';
    
    if (!isProduction && !isEnabled) {
      console.log('🔕 Health check cron job disabled in non-production environment');
      console.log('   To enable, set ENABLE_HEALTH_CRON=true in .env');
      return;
    }

    // Get the base URL (use Render URL in production, localhost in development)
    const baseUrl = process.env.RENDER_EXTERNAL_URL || 
                    process.env.BASE_URL || 
                    `http://localhost:${process.env.PORT || 8890}`;
    
    const healthUrl = `${baseUrl}/api/health`;

    // Schedule cron job to run every 2 minutes
    this.healthCheckJob = cron.schedule('*/2 * * * *', async () => {
      try {
        const startTime = Date.now();
        const response = await axios.get(healthUrl, {
          timeout: 10000, // 10 second timeout
          headers: {
            'User-Agent': 'Keep-Alive-Cron-Job/1.0'
          }
        });
        
        const responseTime = Date.now() - startTime;
        
        if (response.status === 200) {
          console.log(`✅ Health check successful at ${new Date().toISOString()} (${responseTime}ms)`);
        } else {
          console.warn(`⚠️ Health check returned status ${response.status} at ${new Date().toISOString()}`);
        }
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.error(`❌ Health check failed: Server not reachable at ${healthUrl}`);
        } else if (error.code === 'ETIMEDOUT') {
          console.error(`❌ Health check failed: Request timeout after 10 seconds`);
        } else {
          console.error(`❌ Health check failed: ${error.message}`);
        }
      }
    }, {
      scheduled: true,
      timezone: "UTC" // Change to your timezone if needed, e.g., "Asia/Kolkata"
    });

    console.log(`
  ⏰ Health check cron job started!
  📍 URL: ${healthUrl}
  🕒 Schedule: Every 2 minutes (*/2 * * * *)
  🌍 Timezone: UTC
    `);
  }

  // ============================================
  // ✅ GENERATE WEEKLY REPORT
  // ============================================
  async generateWeeklyReport() {
    try {
      const activeTrainers = await User.find({
        role: 'TRAINER',
        status: 'ACTIVE'
      }).select('username email profile.firstName profile.lastName leaveBalance trainerCategory');

      console.log(`📋 Weekly Leave Report - ${new Date().toDateString()}`);
      console.log(`Total Active Trainers: ${activeTrainers.length}`);

      for (const trainer of activeTrainers) {
        const name = `${trainer.profile?.firstName || ''} ${trainer.profile?.lastName || ''}`.trim() || trainer.username;
        console.log(`\n👤 ${name} (${trainer.trainerCategory})`);
        console.log(`   Sick: ${trainer.leaveBalance?.sick?.available || 0} available, ${trainer.leaveBalance?.sick?.used || 0} used`);
        console.log(`   Casual: ${trainer.leaveBalance?.casual?.available || 0} available, ${trainer.leaveBalance?.casual?.used || 0} used`);
        console.log(`   Paid: ${trainer.leaveBalance?.paid?.available === Infinity ? 'Unlimited' : trainer.leaveBalance?.paid?.available || 0} available, ${trainer.leaveBalance?.paid?.used || 0} used`);
      }
    } catch (error) {
      console.error('Error generating weekly report:', error);
    }
  }


// sTOP hEALTH CHECK CRON
  stopHealthCheckCron() {
    if (this.healthCheckJob) {
      this.healthCheckJob.stop();
      console.log('🛑 Health check cron job stopped');
      this.healthCheckJob = null;
    }
  }

  // ============================================
  // ✅ MANUAL TRIGGER ENDPOINTS (For testing)
  // ============================================
  async triggerManualIncrement() {
    try {
      return await this.leaveService.autoIncrementMonthlyLeaves();
    } catch (error) {
      throw error;
    }
  }

  async triggerManualRollover() {
    try {
      return await this.leaveService.autoYearEndRollover();
    } catch (error) {
      throw error;
    }
  }
}