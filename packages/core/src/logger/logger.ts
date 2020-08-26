import { injectable, container } from "tsyringe";

export interface ILogger {
  error(msg: string, ...obj: any[]): void;
  info(msg: string, ...obj: any[]): void;
  warn(msg: string, ...obj: any[]): void;
  debug(msg: string, ...obj: any[]): void;
}

export type Level = 'debug' | 'info' | 'warning' | 'error';

export const diLogger = "ACME.Logger";

@injectable()
export class Logger implements ILogger {
  public level: Level = "info";

  public error(msg: string, ...obj: any[]): void {
    if (this.checkLevel("error")) {
      this.write("error", msg, ...obj);
    }
  }
  public info(msg: string, ...obj: any[]): void {
    if (this.checkLevel("info")) {
      this.write("info", msg, ...obj);
    }
  }
  public warn(msg: string, ...obj: any[]): void {
    if (this.checkLevel("warning")) {
      this.write("warning", msg, ...obj);
    }
  }
  public debug(msg: string, ...obj: any[]): void {
    if (this.checkLevel("debug")) {
      this.write("debug", msg, ...obj);
    }
  }

  protected write(lvl: Level, msg: string, ...obj: any[]) {
    // empty
  }

  protected checkLevel(lvl: Level): boolean {
    // todo mask
    switch (this.level) {
      case "debug":
        return lvl === "error" || lvl === "warning" || lvl === "info" || lvl === "debug";
      case "info":
        return lvl === "error" || lvl === "warning" || lvl === "info";
      case "warning":
        return lvl === "error" || lvl === "warning";
      case "error":
        return lvl === "error";
    }
  }
}

container.register(diLogger, Logger);