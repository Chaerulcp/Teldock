/**
 * Test Script for Authentication API
 * Run: node tests/test-auth.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// Color helper functions
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

async function testHealth() {
    log('\n📍 Testing Health Check...', colors.cyan);
    try {
        const response = await axios.get(`${BASE_URL}/health`);
        if (response.data.success) {
            log('✅ Health check passed!', colors.green);
            return true;
        } else {
            log('❌ Health check failed', colors.red);
            return false;
        }
    } catch (error) {
        log('❌ Unable to connect to server', colors.red);
        return false;
    }
}

async function testRegister() {
    log('\n📍 Testing User Registration...', colors.cyan);
    try {
        const userData = {
            email: `test${Date.now()}@example.com`,
            password: 'SecurePass123!',
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User'
        };

        const response = await axios.post(`${BASE_URL}/auth/register`, userData);
        
        if (response.data.success) {
            log('✅ Registration successful!', colors.green);
            log('   Email:', response.data.data.user.email, colors.yellow);
            
            // Store tokens for next tests
            global.accessToken = response.data.data.accessToken;
            global.refreshToken = response.data.data.refreshToken;
            
            log('   Access Token:', response.data.data.accessToken.substring(0, 50) + '...', colors.yellow);
            
            return true;
        } else {
            log('❌ Registration failed: ' + response.data.error, colors.red);
            return false;
        }
    } catch (error) {
        if (error.response) {
            log('❌ Error: ' + error.response.data.error, colors.red);
        } else {
            log('❌ Unexpected error', colors.red);
        }
        return false;
    }
}

async function testLogin() {
    log('\n📍 Testing User Login...', colors.cyan);
    try {
        const loginData = {
            email: global.testEmail || `test${Date.now()}@example.com`,
            password: 'SecurePass123!'
        };

        const response = await axios.post(`${BASE_URL}/auth/login`, loginData);
        
        if (response.data.success) {
            log('✅ Login successful!', colors.green);
            global.accessToken = response.data.data.accessToken;
            log('   Access Token received', colors.yellow);
            return true;
        } else {
            log('❌ Login failed: ' + response.data.error, colors.red);
            return false;
        }
    } catch (error) {
        if (error.response) {
            log('❌ Error: ' + error.response.data.error, colors.red);
        } else {
            log('❌ Unexpected error', colors.red);
        }
        return false;
    }
}

async function testProtectedRoute() {
    log('\n📍 Testing Protected Route (GET /me)...', colors.cyan);
    
    if (!global.accessToken) {
        log('⚠️ No access token available, skipping test', colors.yellow);
        return true;
    }

    try {
        const response = await axios.get(`${BASE_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${global.accessToken}`
            }
        });
        
        if (response.data.success) {
            log('✅ Protected route accessed successfully!', colors.green);
            log('   User ID:', response.data.data.user.id, colors.yellow);
            log('   Email:', response.data.data.user.email, colors.yellow);
            log('   Storage Used:', (response.data.data.user.storageUsedBytes / 1024 / 1024).toFixed(2), 'MB', colors.yellow);
            return true;
        } else {
            log('❌ Failed to get user info', colors.red);
            return false;
        }
    } catch (error) {
        if (error.response) {
            if (error.response.status === 401 || error.response.status === 403) {
                log('❌ Auth failed - Invalid or expired token', colors.red);
            } else {
                log('❌ Error: ' + error.response.data.error, colors.red);
            }
        } else {
            log('❌ Unexpected error', colors.red);
        }
        return false;
    }
}

async function testRefreshToken() {
    log('\n📍 Testing Token Refresh...', colors.cyan);
    
    if (!global.refreshToken) {
        log('⚠️ No refresh token available, skipping test', colors.yellow);
        return true;
    }

    try {
        const response = await axios.post(`${BASE_URL}/auth/refresh`, {
            refreshToken: global.refreshToken
        });
        
        if (response.data.success) {
            log('✅ Token refreshed successfully!', colors.green);
            global.accessToken = response.data.data.accessToken;
            return true;
        } else {
            log('❌ Token refresh failed', colors.red);
            return false;
        }
    } catch (error) {
        if (error.response) {
            log('❌ Error: ' + error.response.data.error, colors.red);
        } else {
            log('❌ Unexpected error', colors.red);
        }
        return false;
    }
}

async function runAllTests() {
    log('\n╔════════════════════════════════════════════════════════╗', colors.cyan);
    log('║  🧪 Telegram Cloud Storage - Auth API Tests          ║', colors.cyan);
    log('╚════════════════════════════════════════════════════════╝', colors.cyan);

    let passed = 0;
    let total = 0;

    // Test 1: Health check
    total++;
    if (await testHealth()) passed++;

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Register new user
    total++;
    if (await testRegister()) passed++;

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 3: Login
    total++;
    if (await testLogin()) passed++;

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 4: Protected route
    total++;
    if (await testProtectedRoute()) passed++;

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 5: Refresh token
    total++;
    if (await testRefreshToken()) passed++;

    // Summary
    log('\n╔════════════════════════════════════════════════════════╗', colors.cyan);
    log(`║  Results: ${passed}/${total} tests passed                          ║`, passed === total ? colors.green : colors.red);
    log('╚════════════════════════════════════════════════════════╝', colors.cyan);

    process.exit(passed === total ? 0 : 1);
}

runAllTests();
