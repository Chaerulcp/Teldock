const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET ||= "test-jwt-secret-that-is-long-enough-for-signing";

const {
  generateAccessToken,
  generateFileAccessToken,
} = require("../src/services/jwt.service");
const {
  authenticateFileAccess,
} = require("../src/middleware/file-access.middleware");

function createResponse() {
  return {
    body: null,
    statusCode: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("authenticateFileAccess adds the signed token user to the request", () => {
  const signature = generateFileAccessToken({
    userId: "user-1",
    fileId: "file-1",
    disposition: "inline",
  });
  const req = { params: { id: "file-1" }, query: { signature } };
  const res = createResponse();
  let nextCalled = false;

  authenticateFileAccess("inline")(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.deepEqual(req.user, { userId: "user-1" });
});

test("authenticateFileAccess accepts a Bearer access token for existing clients", () => {
  const accessToken = generateAccessToken({
    id: "user-1",
    telegramId: "telegram-1",
    email: "user@example.com",
  });
  const req = {
    params: { id: "file-1" },
    query: {},
    headers: { authorization: `Bearer ${accessToken}` },
  };
  const res = createResponse();
  let nextCalled = false;

  authenticateFileAccess("inline")(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.user.userId, "user-1");
});

test("authenticateFileAccess rejects a signature for another disposition", () => {
  const signature = generateFileAccessToken({
    userId: "user-1",
    fileId: "file-1",
    disposition: "inline",
  });
  const req = { params: { id: "file-1" }, query: { signature } };
  const res = createResponse();

  authenticateFileAccess("attachment")(req, res, () =>
    assert.fail("next must not be called"),
  );

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, "Invalid or expired file access signature");
});
