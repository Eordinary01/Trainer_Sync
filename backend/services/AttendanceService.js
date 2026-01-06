import { Attendance } from '../models/Attendance.model.js';
import User from '../models/User.model.js';
import { GeolocationService } from '../utils/geoLocation.js';
import { DateUtils } from '../utils/dateUtils.js';
import { Validators } from '../utils/validators.js';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from '../utils/errorHandler.js';
import { ATTENDANCE_STATUS } from '../config/constant.js';

export class AttendanceService {
  async clockIn(trainerId, location) {
    const { latitude, longitude } = location;

    if (!Validators.validateCoordinates(latitude, longitude)) {
      throw new ValidationError('Invalid location coordinates');
    }

    const trainer = await User.findById(trainerId);
    if (!trainer) {
      throw new NotFoundError('Trainer not found');
    }

    // Get the latest attendance record for today (if any)
    const today = DateUtils.getStartOfDay();
    const existingAttendance = await Attendance.findOne({
      trainerId,
      date: { $gte: today },
    }).sort({ date: -1 });

    if (existingAttendance && existingAttendance.status === ATTENDANCE_STATUS.CLOCKED_IN) {
      throw new ConflictError('Already clocked in today');
    }

    // Get address from coordinates
    const address = await GeolocationService.getAddressFromCoordinates(latitude, longitude);

    const attendance = new Attendance({
      trainerId,
      date: new Date(),
      clockInTime: new Date(),
      clockInLocation: {
        latitude,
        longitude,
        address,
      },
      status: ATTENDANCE_STATUS.CLOCKED_IN,
    });

    await attendance.save();

    await User.findByIdAndUpdate(trainerId, {
      status: 'ACTIVE',
    });

    return {
      _id: attendance._id,
      clockInTime: attendance.clockInTime,
      location: attendance.clockInLocation,
      message: 'Clocked in successfully',
      trainer: {
        id: trainer._id,
        firstName: trainer.profile.firstName,
        lastName: trainer.profile.lastName,
        employeeId: trainer.profile.employeeId,
        username: trainer.username,
      }
    };
  }

  async clockOut(trainerId, location) {
    const { latitude, longitude } = location;

    if (!Validators.validateCoordinates(latitude, longitude)) {
      throw new ValidationError('Invalid location coordinates');
    }

    const trainer = await User.findById(trainerId);
    if (!trainer) {
      throw new NotFoundError('Trainer not found');
    }

    // Get today's active (CLOCKED_IN) attendance - prefer the latest one
    const today = DateUtils.getStartOfDay();
    const attendance = await Attendance.findOne({
      trainerId,
      date: { $gte: today },
      status: ATTENDANCE_STATUS.CLOCKED_IN,
    }).sort({ date: -1 });

    if (!attendance) {
      throw new ValidationError('No active clock-in found for today');
    }

    const address = await GeolocationService.getAddressFromCoordinates(latitude, longitude);

    const workingHours = DateUtils.calculateWorkingHours(attendance.clockInTime, new Date());

    attendance.clockOutTime = new Date();
    attendance.clockOutLocation = { latitude, longitude, address };
    attendance.totalWorkingHours = workingHours;
    attendance.status = ATTENDANCE_STATUS.CLOCKED_OUT;

    await attendance.save();

    return {
      _id: attendance._id,
      clockOutTime: attendance.clockOutTime,
      totalWorkingHours: workingHours,
      location: attendance.clockOutLocation,
      message: 'Clocked out successfully',
      trainer: {
        id: trainer._id,
        firstName: trainer.profile.firstName,
        lastName: trainer.profile.lastName,
        employeeId: trainer.profile.employeeId,
        username: trainer.username,
      }
    };
  }

  async getTodayStatus(trainerId) {
    const today = DateUtils.getStartOfDay();
    const attendance = await Attendance.findOne({
      trainerId,
      date: { $gte: today },
    }).sort({ date: -1 });

    return {
      hasClockedIn: !!attendance && attendance.status !== ATTENDANCE_STATUS.INCOMPLETE,
      clockInTime: attendance?.clockInTime || null,
      clockOutTime: attendance?.clockOutTime || null,
      totalWorkingHours: attendance?.totalWorkingHours || 0,
      status: attendance?.status || 'NOT_CLOCKED_IN',
    };
  }

  async getAttendanceHistory(trainerId, filters = {}) {
    const query = { trainerId };

    if (filters.fromDate && filters.toDate) {
      if (!Validators.validateDateRange(filters.fromDate, filters.toDate)) {
        throw new ValidationError('Invalid date range');
      }

      query.date = {
        $gte: new Date(filters.fromDate),
        $lte: new Date(filters.toDate),
      };
    }

    if (filters.status) {
      query.status = filters.status;
    }

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const attendance = await Attendance.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ date: -1 });

    const total = await Attendance.countDocuments(query);

    return {
      attendance,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async calculateWorkingHours(trainerId, filters = {}) {
    const query = { trainerId, status: ATTENDANCE_STATUS.CLOCKED_OUT };

    if (filters.fromDate && filters.toDate) {
      query.date = {
        $gte: new Date(filters.fromDate),
        $lte: new Date(filters.toDate),
      };
    }

    const attendance = await Attendance.find(query);

    const totalHours = attendance.reduce((sum, a) => sum + (a.totalWorkingHours || 0), 0);
    const totalDays = attendance.length;
    const averageHours = totalDays > 0 ? totalHours / totalDays : 0;

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      totalDays,
      averageHours: Math.round(averageHours * 100) / 100,
    };
  }

  async getDailyReport(date = new Date()) {
    const startOfDay = DateUtils.getStartOfDay(date);
    const endOfDay = DateUtils.getEndOfDay(date);

    const attendance = await Attendance.find({
      date: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate('trainerId', 'username profile.firstName profile.lastName email')
      .sort({ clockInTime: -1 });

    const summary = {
      totalTrainers: attendance.length,
      clockedIn: attendance.filter(a => a.status === ATTENDANCE_STATUS.CLOCKED_IN).length,
      clockedOut: attendance.filter(a => a.status === ATTENDANCE_STATUS.CLOCKED_OUT).length,
      absent: 0,
      records: attendance,
    };

    return summary;
  }

  async getWeeklyReport(trainerId) {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    const attendance = await Attendance.find({
      trainerId,
      date: { $gte: startDate, $lte: endDate },
      status: ATTENDANCE_STATUS.CLOCKED_OUT,
    }).sort({ date: -1 });

    const dailyHours = {};
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dayName = dayNames[d.getDay()];
      dailyHours[`${dayName} ${DateUtils.formatDate(d, 'DD-MM')}`] = 0;
    }

    attendance.forEach(record => {
      const d = new Date(record.date);
      const dayName = dayNames[d.getDay()];
      const label = `${dayName} ${DateUtils.formatDate(record.date, 'DD-MM')}`;
      dailyHours[label] = record.totalWorkingHours || 0;
    });

    return dailyHours;
  }

  async getMonthlyReport(trainerId) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const attendance = await Attendance.find({
      trainerId,
      date: { $gte: startOfMonth, $lte: endOfMonth },
      status: ATTENDANCE_STATUS.CLOCKED_OUT,
    });

    const dailyHours = {};
    for (let i = 1; i <= endOfMonth.getDate(); i++) dailyHours[`Day ${i}`] = 0;

    attendance.forEach(record => {
      const day = record.date.getDate();
      dailyHours[`Day ${day}`] = record.totalWorkingHours || 0;
    });

    return dailyHours;
  }

  async getTodayClockedInList() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const clockedInRecords = await Attendance.find({
        clockInTime: {
          $gte: today,
          $lt: tomorrow
        },
        clockOutTime: { $exists: false }
      })
      .populate('trainerId', 'username profile.firstName profile.lastName profile.employeeId')
      .sort({ clockInTime: 1 });

      const now = new Date();
      const clockedInList = clockedInRecords.map(record => {
        const clockInTime = new Date(record.clockInTime);
        const durationMs = now - clockInTime;
        const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
        const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

        return {
          id: record._id,
          userId: record.trainerId._id,
          employeeId: record.trainerId.profile.employeeId,
          name: `${record.trainerId.profile.firstName} ${record.trainerId.profile.lastName}`,
          username: record.trainerId.username,
          clockInTime: record.clockInTime,
          duration: {
            hours: durationHours,
            minutes: durationMinutes,
            totalMinutes: Math.floor(durationMs / (1000 * 60))
          },
          location: record.clockInLocation
        };
      });

      return clockedInList;
    } catch (error) {
      console.error('Error in getTodayClockedInList:', error);
      throw error;
    }
  }

  async getAttendanceRate() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const totalTrainers = await User.countDocuments({
      role: 'TRAINER',
      status: 'ACTIVE',
    });

    const clockedInTrainerIds = await Attendance.distinct('trainerId', {
      clockInTime: { $gte: today, $lt: tomorrow },
    });

    const clockedInToday = clockedInTrainerIds.length;
    const attendanceRate = totalTrainers > 0 ? Math.round((clockedInToday / totalTrainers) * 100) : 0;

    return {
      attendanceRate,
      totalTrainers,
      clockedInToday,
    };
  }
}