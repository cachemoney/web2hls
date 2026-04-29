import { describe, it, expect, vi } from 'vitest';
import { MonotonicClock } from './clock';

describe('MonotonicClock', () => {
  it('should not be running by default', () => {
    const clock = new MonotonicClock();
    expect(clock.isRunning).toBe(false);
  });

  it('should throw if now() is called before start', () => {
    const clock = new MonotonicClock();
    expect(() => clock.now()).toThrow('Clock not started');
  });

  it('should start and return elapsed time', async () => {
    const clock = new MonotonicClock();
    clock.start();
    expect(clock.isRunning).toBe(true);
    
    const t1 = clock.now();
    await new Promise(resolve => setTimeout(resolve, 10));
    const t2 = clock.now();
    
    expect(t2).toBeGreaterThan(t1);
  });

  it('should allow initializing with an origin time', () => {
    const origin = 1000000;
    const clock = new MonotonicClock(origin);
    expect(clock.isRunning).toBe(true);
    expect(clock.origin).toBe(origin);
  });

  it('should reset properly', () => {
    const clock = new MonotonicClock();
    clock.start();
    clock.reset();
    expect(clock.isRunning).toBe(false);
    expect(clock.origin).toBe(0);
  });
});
