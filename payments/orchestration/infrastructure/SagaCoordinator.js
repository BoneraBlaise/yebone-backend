/**
 * Saga execution with compensation placeholders — no queues.
 */
class SagaCoordinator {
  constructor() {
    this.steps = [];
  }

  registerStep({ name, execute, compensate = null }) {
    this.steps.push({ name, execute, compensate });
    return this;
  }

  clear() {
    this.steps = [];
    return this;
  }

  async execute(context = {}) {
    const completed = [];

    try {
      for (const step of this.steps) {
        const output = await step.execute(context);
        completed.push({ name: step.name, output });
      }
      return { status: "completed", completed, context };
    } catch (error) {
      const compensation = await this.compensate(completed, context);
      return {
        status: "failed",
        error: { name: error.name, message: error.message },
        completed,
        compensation,
        context,
      };
    }
  }

  async compensate(completedSteps, context = {}) {
    const results = [];

    for (let i = completedSteps.length - 1; i >= 0; i -= 1) {
      const stepName = completedSteps[i].name;
      const step = this.steps.find((s) => s.name === stepName);
      if (!step?.compensate) {
        results.push({ name: stepName, status: "skipped" });
        continue;
      }
      const output = await step.compensate(context, completedSteps[i].output);
      results.push({ name: stepName, status: "compensated", output });
    }

    return results;
  }
}

module.exports = SagaCoordinator;
