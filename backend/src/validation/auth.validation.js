const { z } = require('zod');

const MAX_PASSWORD_BYTES = 72;

function passwordSchema() {
    return z
        .string()
        .min(6, 'Password must be at least 6 characters')
        .refine(
            (value) => Buffer.byteLength(value, 'utf8') <= MAX_PASSWORD_BYTES,
            `Password must not exceed ${MAX_PASSWORD_BYTES} bytes`,
        );
}

const optionalDisplayName = z.string().trim().min(1).max(100).optional();

const registerSchema = z.object({
    email: z.string().trim().email('Email must be valid').max(255),
    password: passwordSchema(),
    username: z.string().trim().min(1).max(255).optional(),
    firstName: optionalDisplayName,
    lastName: optionalDisplayName,
    avatarUrl: z.string().url().max(500).optional(),
});

const loginSchema = z.object({
    email: z.string().trim().email('Email must be valid').max(255),
    password: passwordSchema(),
});

const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1).max(2_048),
});

module.exports = {
    loginSchema,
    refreshTokenSchema,
    registerSchema,
};
