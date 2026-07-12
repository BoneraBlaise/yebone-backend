const initialSeed = {
  name: "platform_bootstrap_placeholder",
  async run(connection) {
    await connection.query("-- placeholder seed data", []);
    return { seeded: false, reason: "placeholder_only" };
  },
};

module.exports = { initialSeed };
