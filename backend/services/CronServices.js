// services/CronService.js
import cron from 'node-cron';
import { LeaveService } from '../services/LeaveService.js';

export class CronService {
  constructor() {
    this.leaveService = new LeaveService();
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