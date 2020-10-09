import { Logger, LoggerData, LoggerLevel } from "./logger";

export class ConsoleLogger extends Logger {

  protected onWrite(lvl: LoggerLevel, msg: string, obj?: LoggerData) {
    switch (lvl.toString()) {
      case "debug":
        if (obj) {
          console.debug(msg, obj);
        }
        console.debug(msg);
        break;
      case "warning":
        if (obj) {
          console.warn(msg, obj);
        }
        console.warn(msg);
        break;
      case "error":
        if (obj) {
          console.error(msg, obj);
        }
        console.error(msg);
        break;
      case "info":
      default:
        if (obj) {
          console.info(msg, obj);
        }
        console.log(msg);
        break;
    }
  }

}
