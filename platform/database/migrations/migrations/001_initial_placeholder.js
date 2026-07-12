const initialSchemaMigration = {
  version: 1,
  name: "initial_platform_schema_placeholder",
  description: "Placeholder migration — does not modify existing MongoDB collections",
  async up(connection) {
    await connection.query(
      "-- placeholder: future PostgreSQL platform tables only",
      []
    );
  },
  async down(connection) {
    await connection.query("-- placeholder rollback", []);
  },
};

module.exports = { initialSchemaMigration };
