const test = require('node:test');
const assert = require('node:assert/strict');

const {
    formatFileSize,
    sanitizeFilename,
} = require('../src/middleware/file-upload.middleware');

test('sanitizeFilename replaces characters that are unsafe in file names', () => {
    assert.equal(sanitizeFilename('a<b>c:d"e\\f|g?h*i.txt'), 'a_b_c_d_e_f_g_h_i.txt');
});

test('sanitizeFilename strips control characters', () => {
    assert.equal(sanitizeFilename('con\u0000trol\u001fname\u007f.txt'), 'controlname.txt');
});

test('sanitizeFilename preserves the extension while truncating a long base name', () => {
    const result = sanitizeFilename(`${'x'.repeat(300)}.txt`);

    assert.equal(result.length, 200 + 4);
    assert.ok(result.endsWith('.txt'));
});

test('formatFileSize renders human readable sizes', () => {
    assert.equal(formatFileSize(0), '0 Bytes');
    assert.equal(formatFileSize(1023), '1023 Bytes');
    assert.equal(formatFileSize(1024), '1 KB');
    assert.equal(formatFileSize(1536), '1.5 KB');
    assert.equal(formatFileSize(1024 * 1024), '1 MB');
});

test('sanitizeFilename neutralizes forward slashes so a name cannot traverse paths', () => {
    assert.equal(sanitizeFilename('../../etc/passwd'), '.._.._etc_passwd');
    assert.equal(sanitizeFilename('a/b/c.txt'), 'a_b_c.txt');
    assert.ok(!sanitizeFilename('../../etc/passwd').includes('/'));
});

test('sanitizeFilename neutralizes backslashes so a name cannot traverse paths', () => {
    const result = sanitizeFilename('..\\..\\windows\\system32\\cmd.exe');

    assert.equal(result, '.._.._windows_system32_cmd.exe');
    assert.ok(!result.includes('\\'));
});

test('sanitizeFilename replaces a bare directory token with a usable name', () => {
    assert.equal(sanitizeFilename('.'), 'unnamed-file');
    assert.equal(sanitizeFilename('..'), 'unnamed-file');
});

test('sanitizeFilename falls back for empty or non-string input', () => {
    assert.equal(sanitizeFilename(''), 'unnamed-file');
    assert.equal(sanitizeFilename(null), 'unnamed-file');
    assert.equal(sanitizeFilename(undefined), 'unnamed-file');
});

test('sanitizeFilename always returns a non-empty name with no separators', () => {
    const inputs = ['/', '///', '\\', '...', '  ', '<>:"|?*'];

    for (const input of inputs) {
        const result = sanitizeFilename(input);
        assert.ok(result.length > 0, `expected a usable name for ${JSON.stringify(input)}`);
        assert.ok(!result.includes('/') && !result.includes('\\'), `separator survived: ${result}`);
    }
});
