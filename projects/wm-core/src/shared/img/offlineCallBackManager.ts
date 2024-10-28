export class OfflineCallbackManager {
  static offlineCallback: (src: string) => Promise<ArrayBuffer | string>;

  static getOfflineCallback(): (src: string) => Promise<ArrayBuffer | string> {
    return this.offlineCallback;
  }

  static setOfflineCallback(callback: (src: string) => Promise<ArrayBuffer | string>): void {
    this.offlineCallback = callback;
  }
}
