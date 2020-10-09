import { Logger, LoggerData, LoggerLevel } from "./logger";

export class ConsoleLogger extends Logger {

  protected onWrite(lvl: LoggerLevel, msg: string, obj?: LoggerData) {
    switch (lvl) {
      case LoggerLevel.debug:
        if (obj) {
          console.debug(msg, obj);
        }
        console.debug(msg);
        break;
      case LoggerLevel.warn:
        if (obj) {
          console.warn(msg, obj);
        }
        console.warn(msg);
        break;
      case LoggerLevel.error:
        if (obj) {
          console.error(msg, obj);
        }
        console.error(msg);
        break;
      case LoggerLevel.info:
      default:
        if (obj) {
          console.info(msg, obj);
        }
        console.log(msg);
        break;
    }
  }

}
