import { container } from "tsyringe";
import { diLogger, ILogger } from "./logger";

/**
 * Abstract logger class for source name usage
 */
export abstract class SourceLogger {
  private logger = container.resolve<ILogger>(diLogger);
  public info(msg: string, ...args: any[]) {
    this.logger.info(msg, ...args);
  }
  public debug(msg: string, ...args: any[]) {
    this.logger.debug(msg, ...args);
  }
  public error(msg: string, ...args: any[]) {
    this.logger.error(msg, ...args);
  }
  public warn(msg: string, ...args: any[]) {
    this.logger.warn(msg, ...args);
  }
}
