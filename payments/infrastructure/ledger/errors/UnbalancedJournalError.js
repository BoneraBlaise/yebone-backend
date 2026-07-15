class UnbalancedJournalError extends Error {
  constructor(journalId, totalDebit, totalCredit) {
    super(
      `Unbalanced journal ${journalId}: debits=${totalDebit.toFixed(2)} credits=${totalCredit.toFixed(2)}`
    );
    this.name = "UnbalancedJournalError";
    this.code = "UNBALANCED_JOURNAL";
    this.journalId = journalId;
    this.totalDebit = totalDebit;
    this.totalCredit = totalCredit;
  }
}

module.exports = UnbalancedJournalError;
