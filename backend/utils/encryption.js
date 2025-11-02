import crypto from 'crypto';

export class Encryption {
  static generatePasswordResetToken() {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return { token, hash };
  }

  static generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}