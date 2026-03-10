/**
 * Global Jest setup: mock all external services so tests run
 * without a real DB, Telegram bot, mailer, or audit logger.
 */

// ── Mongoose: prevent real connections ───────────────────────────────────────
jest.mock('mongoose', () => {
    const actual = jest.requireActual('mongoose');
    return {
        ...actual,
        connect: jest.fn().mockResolvedValue(undefined),
        connection: { on: jest.fn(), once: jest.fn(), close: jest.fn() },
    };
});

// ── Telegram config: stub out bot initialisation ──────────────────────────────
jest.mock('../config/telegram', () => ({}));

// ── Database connection: no-op ────────────────────────────────────────────────
jest.mock('../config/database', () => ({
    connectDB: jest.fn().mockResolvedValue(undefined),
}));

// ── AuditLogger: no-op ───────────────────────────────────────────────────────
jest.mock('../utils/auditLogger', () => ({
    createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

// ── OTP / Telegram sender: no-op ─────────────────────────────────────────────
jest.mock('../middlewares/otp/otpSender', () => ({
    sendMSGViaTelegram: jest.fn().mockResolvedValue(undefined),
    sendOTPViaTelegram: jest.fn().mockResolvedValue(undefined),
}));

// ── Brevo mailer: no-op ───────────────────────────────────────────────────────
jest.mock('../middlewares/mail/mailer', () => ({
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    sendEmail: jest.fn().mockResolvedValue(undefined),
}));

// Silence console.error during tests to keep output clean
beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => { });
});

afterAll(() => {
    (console.error as jest.Mock).mockRestore?.();
});
