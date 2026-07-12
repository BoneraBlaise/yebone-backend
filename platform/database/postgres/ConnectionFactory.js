const PostgreSQLConnection = require("./PostgreSQLConnection");
const PlaceholderPostgreSQLAdapter = require("./PlaceholderPostgreSQLAdapter");

class ConnectionFactory {
  constructor({ databaseConfig }) {
    this.databaseConfig = databaseConfig;
    this.adapter = new PlaceholderPostgreSQLAdapter();
  }

  create() {
    return new PostgreSQLConnection({
      config: this.databaseConfig,
      adapter: this.adapter,
    });
  }
}

module.exports = ConnectionFactory;
