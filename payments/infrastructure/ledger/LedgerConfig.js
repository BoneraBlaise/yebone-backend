const LedgerConfig = {
  version: "6.0.0-foundation",
  defaultCurrency: "UGX",
  supportedCurrencies: ["UGX", "USD", "KES", "TZS", "RWF"],
  decimalPlaces: 2,
  maxEntriesPerJournal: 64,
  journalIdPrefix: "jrnl",
  entryIdPrefix: "entry",
};

module.exports = LedgerConfig;
