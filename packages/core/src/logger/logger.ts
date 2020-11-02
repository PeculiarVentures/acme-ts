import { injectable, container } from "tsyringe";

export interface ILogger {
  level: LoggerLevel;
  error(msg: string, obj?: LoggerData): void;
  info(msg: string, obj?: LoggerData): void;
  warn(msg: string, obj?: LoggerData): void;
  debug(msg: string, obj?: LoggerData): void;
}

export enum LoggerLevel {
  error,
  warn,
  info,
  debug,
}

export interface LoggerData {
  [key: string]: any;
}

export const diLogger = "ACME.Logger";

@injectable()
export class Logger implements ILogger {

  public level: LoggerLevel = LoggerLevel.info;

  public error(msg: string, obj?: LoggerData): void {
    this.write(LoggerLevel.error, msg, obj);
  }
  public info(msg: string, obj?: LoggerData): void {
    this.write(LoggerLevel.info, msg, obj);
  }
  public warn(msg: string, obj?: LoggerData): void {
    this.write(LoggerLevel.warn, msg, obj);
  }
  public debug(msg: string, obj?: LoggerData): void {
    this.write(LoggerLevel.debug, msg, obj);
  }

  public write(lvl: LoggerLevel, msg: string, obj?: LoggerData) {
    if (this.checkLevel(lvl)) {
      this.onWrite(lvl, msg, obj);
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected onWrite(lvl: LoggerLevel, msg: string, obj?: LoggerData) {
    // empty
  }

  protected checkLevel(lvl: LoggerLevel): boolean {
    return this.level >= lvl;
  }
}

container.register(diLogger, Logger);
