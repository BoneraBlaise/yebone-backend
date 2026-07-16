const ProviderIdempotencyContract = require("../ProviderIdempotencyContract");
const ProviderReferenceContract = require("../ProviderReferenceContract");

/**
 * Applies Module 9 contract surface to runtime adapters — delegates only, no duplicated logic.
 */
function applyRuntimeAdapterContractSurface(adapter, providerCode) {
  const code = String(providerCode || adapter.providerCode).trim().toUpperCase();

  adapter.providerReference = new ProviderReferenceContract(code);
  adapter.providerIdempotency = new ProviderIdempotencyContract(code);

  adapter.buildProviderReference = (input = {}) => adapter.providerReference.buildReference(input);
  adapter.validateProviderReference = (referenceInput) =>
    adapter.providerReference.validateReference(referenceInput);
  adapter.buildProviderReferenceMetadata = (input = {}) =>
    adapter.providerReference.buildOptionalMetadata(input);

  adapter.buildProviderIdempotencyKey = (input = {}) => adapter.providerIdempotency.buildKey(input);
  adapter.validateProviderIdempotencyKey = (keyInput) =>
    adapter.providerIdempotency.validateKey(keyInput);
  adapter.supportsProviderIdempotency = () => adapter.providerIdempotency.supportsProviderIdempotency();
  adapter.buildProviderIdempotencyMetadata = (input = {}) =>
    adapter.providerIdempotency.buildOptionalMetadata(input);

  return adapter;
}

module.exports = { applyRuntimeAdapterContractSurface };
