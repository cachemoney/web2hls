export class MonotonicClock {
  private startTime: number = 0;
  private running = false;

  start(): void {
    this.startTime = performance.now() * 1000;
    this.running = true;
  }

  now(): number {
    if (!this.running) throw new Error('Clock not started');
    return Math.round(performance.now() * 1000 - this.startTime);
  }

  reset(): void {
    this.running = false;
    this.startTime = 0;
  }

  get isRunning(): boolean {
    return this.running;
  }
}
