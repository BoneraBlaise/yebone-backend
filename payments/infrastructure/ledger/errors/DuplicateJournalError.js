class DuplicateJournalError extends Error {
  constructor(journalId) {
    super(`Journal already posted: ${journalId}`);
    this.name = "DuplicateJournalError";
    this.code = "DUPLICATE_JOURNAL";
    this.journalId = journalId;
    this.statusCode = 409;
  }
}

module.exports = DuplicateJournalError;
