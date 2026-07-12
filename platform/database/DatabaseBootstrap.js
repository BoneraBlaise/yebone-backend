const ConnectionFactory = require("./postgres/ConnectionFactory");
const ConnectionLifecycle = require("./postgres/ConnectionLifecycle");
const ConnectionHealthCheck = require("./postgres/ConnectionHealthCheck");
const TransactionManager = require("./postgres/TransactionManager");
const MigrationRegistry = require("./migrations/MigrationRegistry");
const MigrationVersionTracker = require("./migrations/MigrationVersionTracker");
const MigrationRunner = require("./migrations/MigrationRunner");
const RollbackManager = require("./migrations/RollbackManager");
const SeedRegistry = require("./seeds/SeedRegistry");
const SeedRunner = require("./seeds/SeedRunner");
const RepositoryRegistry = require("./repositories/RepositoryRegistry");
const { initialSchemaMigration } = require("./migrations/migrations/001_initial_placeholder");
const { initialSeed } = require("./seeds/seeds/001_initial_placeholder");

class DatabaseBootstrap {
  static create({ databaseConfig }) {
    const connectionFactory = new ConnectionFactory({ databaseConfig });
    const connection = connectionFactory.create();
    const lifecycle = new ConnectionLifecycle({ connection });
    const healthCheck = new ConnectionHealthCheck({ connection });
    const transactionManager = new TransactionManager({ connection });
    const migrationRegistry = new MigrationRegistry().register(initialSchemaMigration);
    const migrationTracker = new MigrationVersionTracker();
    const migrationRunner = new MigrationRunner({
      registry: migrationRegistry,
      tracker: migrationTracker,
      connection,
    });
    const rollbackManager = new RollbackManager({
      registry: migrationRegistry,
      tracker: migrationTracker,
      connection,
    });
    const seedRegistry = new SeedRegistry().register(initialSeed);
    const seedRunner = new SeedRunner({ registry: seedRegistry, connection });
    const repositoryRegistry = new RepositoryRegistry();

    return {
      connectionFactory,
      connection,
      lifecycle,
      healthCheck,
      transactionManager,
      migrationRegistry,
      migrationTracker,
      migrationRunner,
      rollbackManager,
      seedRegistry,
      seedRunner,
      repositoryRegistry,
    };
  }
}

module.exports = DatabaseBootstrap;
