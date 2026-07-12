/**
 * Stack trace formatter.
 */
class StackTraceFormatter {
  static format(error) {
    if (!error) return null;
    if (typeof error.stack === "string") {
      return error.stack.split("\n").map((line) => line.trim());
    }
    return [String(error)];
  }
}

module.exports = StackTraceFormatter;
