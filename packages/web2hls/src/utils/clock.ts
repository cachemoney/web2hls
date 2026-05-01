/**
 * High-resolution monotonic clock for A/V synchronization.
 * Uses microseconds (1/1,000,000th of a second) as the unit.
 */
export class MonotonicClock {
  private startTime: number = 0;
  private running = false;

  /**
   * Creates a new MonotonicClock.
   * @param startTime Optional origin time in microseconds. If provided, the clock starts immediately.
   */
  constructor(startTime?: number) {
    if (startTime !== undefined) {
      this.startTime = startTime;
      this.running = true;
    }
  }

  /**
   * Starts the clock from the current time.
   */
  start(): void {
    if (this.running) return;
    this.startTime = performance.now() * 1000;
    this.running = true;
  }

  /**
   * Returns the elapsed time in microseconds since the clock started.
   * @returns Microseconds elapsed, or 0 if the clock is not started.
   */
  now(): number {
    if (!this.running) return 0;
    return Math.round(performance.now() * 1000 - this.startTime);
  }

  /**
   * Resets the clock to an idle state.
   */
  reset(): void {
    this.running = false;
    this.startTime = 0;
  }

  /**
   * Whether the clock is currently running.
   */
  get isRunning(): boolean {
    return this.running;
  }

  /**
   * Returns the origin time (start time) in microseconds.
   * Useful for sharing the same timeline across threads.
   */
  get origin(): number {
    return this.startTime;
  }
}
