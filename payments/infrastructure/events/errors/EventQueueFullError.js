class EventQueueFullError extends Error {
  constructor(maxSize) {
    super(`Event queue is full (max ${maxSize})`);
    this.name = "EventQueueFullError";
    this.code = "EVENT_QUEUE_FULL";
    this.maxSize = maxSize;
  }
}

module.exports = EventQueueFullError;
