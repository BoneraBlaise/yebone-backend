class ImmutableEntryError extends Error {
  constructor(message = "Ledger entries are immutable; use reversing entries only") {
    super(message);
    this.name = "ImmutableEntryError";
    this.code = "IMMUTABLE_ENTRY";
  }
}

module.exports = ImmutableEntryError;
