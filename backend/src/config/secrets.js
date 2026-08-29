require('dotenv').config();

/**
 * Central resolver for secrets. Missing or placeholder values fail at boot
 * instead of silently degrading to a constant that is public in the repo.
 */

// Values shipped in .env.example — accepting any of them would mean anyone with
// the repository can forge tokens or decrypt stored bot credentials.
const KNOWN_PLACEHOLDERS = [
    'your-secret-encryption-key-change-in-production',
    'default-secret',
    'your-super-secret-jwt-key-change-in-production',
    'your-refresh-token-secret-key',
    'change-this-to-a-long-random-secret',
    'change-me',
    'changeme'
];

const MIN_SECRET_LENGTH = 32;

function requireSecret(name, { minLength = MIN_SECRET_LENGTH } = {}) {
    const value = process.env[name];

    if (!value) {
        throw new Error(
            `${name} is not set. Generate one with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
        );
    }

    if (KNOWN_PLACEHOLDERS.includes(value.trim().toLowerCase())) {
        throw new Error(`${name} is still the example placeholder value. Replace it with a real secret.`);
    }

    if (value.length < minLength) {
        throw new Error(`${name} must be at least ${minLength} characters (got ${value.length}).`);
    }

    return value;
}

/**
 * Validate every required secret at once so a misconfigured deployment fails
 * on boot with a complete list rather than on first request.
 */
function assertSecrets() {
    const errors = [];
    for (const name of ['JWT_SECRET', 'REFRESH_TOKEN_SECRET', 'ENCRYPTION_KEY']) {
        try {
            requireSecret(name);
        } catch (error) {
            errors.push(error.message);
        }
    }

    if (errors.length > 0) {
        throw new Error(`Invalid secret configuration:\n  - ${errors.join('\n  - ')}`);
    }
}

module.exports = {
    requireSecret,
    assertSecrets,
    get jwtSecret() { return requireSecret('JWT_SECRET'); },
    get refreshTokenSecret() { return requireSecret('REFRESH_TOKEN_SECRET'); },
    get encryptionKey() { return requireSecret('ENCRYPTION_KEY'); }
};
