class LockAcquisitionError extends Error {
  constructor(resourceId) {
    super(`Unable to acquire lock for resource: ${resourceId}`);
    this.name = "LockAcquisitionError";
    this.resourceId = resourceId;
  }
}

module.exports = LockAcquisitionError;
