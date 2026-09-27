require('dotenv').config();

/**
 * Password hashing parameters.
 *
 * The cost factor is configurable through `BCRYPT_ROUNDS` so operators can
 * raise it on faster hardware. A value outside the safe range is rejected in
 * favour of the default, because a silently misconfigured cost would either
 * weaken stored hashes or make every login pathologically slow.
 */

const DEFAULT_BCRYPT_ROUNDS = 12;
const MIN_BCRYPT_ROUNDS = 4;
const MAX_BCRYPT_ROUNDS = 15;

function resolveBcryptRounds() {
    const raw = process.env.BCRYPT_ROUNDS;
    if (raw === undefined || raw === '') return DEFAULT_BCRYPT_ROUNDS;

    const parsed = Number.parseInt(raw, 10);
    if (!Number.isInteger(parsed) || parsed < MIN_BCRYPT_ROUNDS || parsed > MAX_BCRYPT_ROUNDS) {
        console.warn(
            `BCRYPT_ROUNDS must be an integer between ${MIN_BCRYPT_ROUNDS} and ${MAX_BCRYPT_ROUNDS} ` +
                `(got "${raw}"). Falling back to ${DEFAULT_BCRYPT_ROUNDS}.`
        );
        return DEFAULT_BCRYPT_ROUNDS;
    }

    return parsed;
}

module.exports = {
    DEFAULT_BCRYPT_ROUNDS,
    resolveBcryptRounds,
    get bcryptRounds() {
        return resolveBcryptRounds();
    },
};
