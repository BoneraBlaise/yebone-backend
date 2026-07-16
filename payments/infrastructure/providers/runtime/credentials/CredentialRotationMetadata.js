/**
 * Immutable credential rotation metadata — architecture only; no automatic refresh.
 */
function createCredentialRotationMetadata({ version, expiresAt, rotatedAt } = {}) {
  const parsedVersion = Number(version);
  const normalizedVersion = Number.isFinite(parsedVersion) && parsedVersion > 0 ? parsedVersion : 1;

  return Object.freeze({
    version: normalizedVersion,
    expiresAt: expiresAt ? String(expiresAt) : null,
    rotatedAt: rotatedAt ? String(rotatedAt) : null,
  });
}

function isExpired(rotation, now = Date.now()) {
  if (!rotation?.expiresAt) {
    return false;
  }
  const expiresAtMs = Date.parse(rotation.expiresAt);
  if (Number.isNaN(expiresAtMs)) {
    return false;
  }
  return expiresAtMs <= now;
}

module.exports = {
  createCredentialRotationMetadata,
  isExpired,
};
