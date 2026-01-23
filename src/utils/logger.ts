export default class Logger {
  private static instance: Logger;
  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public static log(message: string) {
    console.log(`[real jobs] ${message}`);
  }
}