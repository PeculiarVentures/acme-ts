import { Logger, Level } from "./logger";

export class ConsoleLogger extends Logger {

  protected write(lvl: Level, msg: string, ...obj: any[]) {
    switch (lvl) {
      case "debug":
        console.debug(msg, ...obj);
        break;
      case "warning":
        console.warn(msg, ...obj);
        break;
      case "error":
        console.error(msg, ...obj);
        break;
      case "info":
        console.log(msg, ...obj);
        break;
    }
  }

}
