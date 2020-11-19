import { injectable, container, Lifecycle } from "tsyringe";

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

export type LoggerLevelType = keyof typeof LoggerLevel;

export interface LoggerData {
  [key: string]: any;
}

export interface LoggerInfo {
  class: string;
  timestamp: Date;
  level: LoggerLevelType;
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
      const info: LoggerInfo = {
        level: LoggerLevel[lvl] as LoggerLevelType,
        timestamp: new Date(),
        class: this.caller(),
      };
      this.onWrite(info, msg, obj);
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected onWrite(info: LoggerInfo, msg: string, obj?: LoggerData) {
    // empty
  }

  protected checkLevel(lvl: LoggerLevel): boolean {
    return this.level >= lvl;
  }

  protected caller() {
    try {
      throw new Error();
    }
    catch (e) {
      const regex = /at ([a-zA-Z0-9_.]+) \(/gm;
      const stack = e.stack;
      let matches: RegExpExecArray | null = null;
      let skipCount = 3;
      // eslint-disable-next-line no-cond-assign
      while (matches = regex.exec(stack)) {
        if (skipCount--) {
          continue;
        }

        return matches[1].split(".")[0];
      }

      return "undefined";
    }
  }
}

container.register(diLogger, Logger, { lifecycle: Lifecycle.Singleton });
