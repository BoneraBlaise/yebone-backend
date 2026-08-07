const { describe, it, beforeEach, mock } = require("node:test");
const assert = require("node:assert/strict");
const { resolveGoogleUser } = require("../googleAccountLink");

function makeProfile(overrides = {}) {
  return {
    id: "google-123",
    displayName: "Test User",
    emails: [{ value: "Test@Example.com" }],
    photos: [{ value: "https://example.com/photo.jpg" }],
    ...overrides,
  };
}

describe("resolveGoogleUser", () => {
  let savedUsers;
  let User;

  beforeEach(() => {
    savedUsers = [];
    User = {
      findOne: mock.fn(async ({ email }) =>
        savedUsers.find((u) => u.email === email) || null
      ),
      create: mock.fn(async (payload) => {
        const user = {
          _id: "user-new",
          ...payload,
          save: mock.fn(async function save() {
            const idx = savedUsers.findIndex((u) => u.email === this.email);
            if (idx >= 0) savedUsers[idx] = this;
            else savedUsers.push(this);
            return this;
          }),
        };
        savedUsers.push(user);
        return user;
      }),
    };
  });

  it("creates a new user when email is unknown", async () => {
    const result = await resolveGoogleUser(makeProfile(), User);
    assert.ok(result.user);
    assert.equal(result.user.authProvider, "google");
    assert.equal(result.user.googleId, "google-123");
    assert.equal(result.user.email, "test@example.com");
    assert.equal(result.user.avatar.url, "https://example.com/photo.jpg");
    assert.equal(result.isNewUser, true);
    assert.equal(User.create.mock.calls.length, 1);
  });

  it("uses profile._json.picture when photos array is empty", async () => {
    const result = await resolveGoogleUser(
      makeProfile({ photos: [], _json: { picture: "https://example.com/json-photo.jpg" } }),
      User
    );
    assert.equal(result.user.avatar.url, "https://example.com/json-photo.jpg");
  });

  it("links Google to an existing local account without creating a duplicate", async () => {
    const localUser = {
      _id: "user-local",
      email: "test@example.com",
      authProvider: "local",
      role: "Admin",
      googleId: undefined,
      save: mock.fn(async function save() {
        return this;
      }),
    };
    savedUsers.push(localUser);

    const result = await resolveGoogleUser(makeProfile(), User);
    assert.ok(result.user);
    assert.equal(result.user.googleId, "google-123");
    assert.equal(result.user.authProvider, "local");
    assert.equal(result.user.role, "Admin");
    assert.equal(result.isNewUser, false);
    assert.equal(User.create.mock.calls.length, 0);
    assert.equal(localUser.save.mock.calls.length, 1);
  });

  it("rejects when email is linked to a different Google account", async () => {
    savedUsers.push({
      _id: "user-other",
      email: "test@example.com",
      googleId: "google-other",
      authProvider: "google",
    });

    const result = await resolveGoogleUser(makeProfile(), User);
    assert.equal(result.error, "EMAIL_LINKED_TO_OTHER_GOOGLE");
    assert.equal(User.create.mock.calls.length, 0);
  });

  it("returns existing user on duplicate key race", async () => {
    const existing = {
      _id: "user-race",
      email: "test@example.com",
      authProvider: "google",
      googleId: "google-123",
      avatar: {
        public_id: "google_google-123",
        url: "https://example.com/photo.jpg",
      },
      save: mock.fn(async function save() {
        return this;
      }),
    };
    User.create = mock.fn(async () => {
      const err = new Error("duplicate");
      err.code = 11000;
      throw err;
    });
    User.findOne = mock.fn(async () => existing);

    const result = await resolveGoogleUser(makeProfile(), User);
    assert.equal(result.user, existing);
    assert.equal(result.isNewUser, false);
  });
});
