/**
 * Credential provider contract — no secrets in repository.
 * Implementations: environment, secret manager (stub), vault (stub).
 */
class CredentialProvider {
  async getCredentials(providerCode) {
    throw new Error("CredentialProvider.getCredentials must be implemented");
  }

  supports(providerCode) {
    return false;
  }
}

module.exports = CredentialProvider;
