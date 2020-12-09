import { Logger, LoggerData, LoggerInfo } from "./logger";

export class ConsoleLogger extends Logger {

  protected onWrite(info: LoggerInfo, msg: string, obj?: LoggerData) {
    msg = `${`[${info.level}]`.padEnd(7, " ")} ${info.timestamp.toISOString()} ${info.class}: ${msg}`;
    switch (info.level) {
      case "debug":
        if (obj) {
          console.debug(msg, obj);
        } else {
          console.debug(msg);
        }
        break;
      case "warn":
        if (obj) {
          console.warn(msg, obj);
        } else {
          console.warn(msg);
        }
        break;
      case "error":
        if (obj) {
          console.error(msg, obj);
        } else {
          console.error(msg);
        }
        break;
      case "info":
      default:
        if (obj) {
          console.info(msg, obj);
        } else {
          console.info(msg);
        }
        break;
    }
  }

}
