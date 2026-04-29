import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from './logger';
import { LogLevel } from '../types';

describe('Logger', () => {
  beforeEach(() => {
    logger.setLevel(LogLevel.INFO);
    vi.clearAllMocks();
  });

  it('should log info messages by default', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    logger.info('test info');
    expect(spy).toHaveBeenCalledWith('[web2hls] INFO: test info');
  });

  it('should not log debug messages by default', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    logger.debug('test debug');
    expect(spy).not.toHaveBeenCalled();
  });

  it('should log debug messages when level is set to DEBUG', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    logger.setLevel(LogLevel.DEBUG);
    logger.debug('test debug');
    expect(spy).toHaveBeenCalledWith('[web2hls] DEBUG: test debug');
  });

  it('should respect LogLevel.NONE', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    logger.setLevel(LogLevel.NONE);
    logger.info('test info');
    logger.error('test error');
    
    expect(infoSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
