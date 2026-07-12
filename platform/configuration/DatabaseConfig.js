class DatabaseConfig {
  constructor(env) {
    this.mongoUrl = env.get("DB_URL", "");
    this.postgresUrl = env.get("POSTGRES_URL", "");
    this.poolSize = 5;
    this.connectTimeoutMs = 10000;
    this.retryAttempts = 3;
  }
}
module.exports = DatabaseConfig;
