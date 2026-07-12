const AccountType = require("./AccountType");

/**
 * Double-entry accounting ledger — in-memory journal only.
 * Every financial action creates balanced debit/credit entries.
 */
class AccountingLedger {
  constructor() {
    this.journals = [];
  }

  _entry({ journalId, account, debit = 0, credit = 0, reference, description, metadata = {} }) {
    return {
      journalId,
      account,
      debit: Number(debit.toFixed(2)),
      credit: Number(credit.toFixed(2)),
      reference,
      description,
      metadata,
      recordedAt: new Date().toISOString(),
    };
  }

  _validateBalanced(entries) {
    const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);
    if (Number(totalDebit.toFixed(2)) !== Number(totalCredit.toFixed(2))) {
      throw new Error(
        `Unbalanced journal: debits=${totalDebit.toFixed(2)} credits=${totalCredit.toFixed(2)}`
      );
    }
  }

  recordJournal({ journalId, reference, description, entries, metadata = {} }) {
    this._validateBalanced(entries);
    const journal = {
      journalId,
      reference,
      description,
      entries,
      metadata,
      recordedAt: new Date().toISOString(),
    };
    this.journals.push(journal);
    return journal;
  }

  recordOrderPayment({ journalId, reference, amount, metadata = {} }) {
    return this.recordJournal({
      journalId,
      reference,
      description: "Order payment received",
      metadata,
      entries: [
        this._entry({ journalId, account: AccountType.MARKETPLACE_CASH, debit: amount, reference, description: "Cash in" }),
        this._entry({ journalId, account: AccountType.ESCROW, credit: amount, reference, description: "Escrow liability" }),
      ],
    });
  }

  recordEscrowRelease({ journalId, reference, amount, metadata = {} }) {
    return this.recordJournal({
      journalId,
      reference,
      description: "Escrow released to vendor",
      metadata,
      entries: [
        this._entry({ journalId, account: AccountType.ESCROW, debit: amount, reference }),
        this._entry({ journalId, account: AccountType.VENDOR_WALLET, credit: amount, reference }),
      ],
    });
  }

  recordCommission({ journalId, reference, amount, metadata = {} }) {
    return this.recordJournal({
      journalId,
      reference,
      description: "Platform commission recognized",
      metadata,
      entries: [
        this._entry({ journalId, account: AccountType.ESCROW, debit: amount, reference }),
        this._entry({ journalId, account: AccountType.PLATFORM_REVENUE, credit: amount, reference }),
      ],
    });
  }

  recordRefund({ journalId, reference, amount, metadata = {} }) {
    return this.recordJournal({
      journalId,
      reference,
      description: "Refund liability recorded",
      metadata,
      entries: [
        this._entry({ journalId, account: AccountType.REFUND_LIABILITY, debit: amount, reference }),
        this._entry({ journalId, account: AccountType.MARKETPLACE_CASH, credit: amount, reference }),
      ],
    });
  }

  recordPayout({ journalId, reference, amount, metadata = {} }) {
    return this.recordJournal({
      journalId,
      reference,
      description: "Vendor payout obligation",
      metadata,
      entries: [
        this._entry({ journalId, account: AccountType.VENDOR_WALLET, debit: amount, reference }),
        this._entry({ journalId, account: AccountType.PAYOUT_LIABILITY, credit: amount, reference }),
      ],
    });
  }

  recordDeliveryRevenue({ journalId, reference, amount, metadata = {} }) {
    return this.recordJournal({
      journalId,
      reference,
      description: "Delivery revenue allocation",
      metadata,
      entries: [
        this._entry({ journalId, account: AccountType.ESCROW, debit: amount, reference }),
        this._entry({ journalId, account: AccountType.DELIVERY_REVENUE, credit: amount, reference }),
      ],
    });
  }

  recordWalletMovement({ journalId, reference, amount, direction = "credit", metadata = {} }) {
    const entries =
      direction === "credit"
        ? [
            this._entry({ journalId, account: AccountType.MARKETPLACE_CASH, debit: amount, reference }),
            this._entry({ journalId, account: AccountType.CUSTOMER_WALLET, credit: amount, reference }),
          ]
        : [
            this._entry({ journalId, account: AccountType.CUSTOMER_WALLET, debit: amount, reference }),
            this._entry({ journalId, account: AccountType.MARKETPLACE_CASH, credit: amount, reference }),
          ];

    return this.recordJournal({
      journalId,
      reference,
      description: `Wallet ${direction}`,
      metadata,
      entries,
    });
  }

  getJournals() {
    return [...this.journals];
  }
}

module.exports = AccountingLedger;
