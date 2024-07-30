export class OfflineCallbackManager {
    static offlineCallback: (src: string) => Promise<ArrayBuffer>;

    static getOfflineCallback(): (src: string) => Promise<ArrayBuffer> {
      return this.offlineCallback;
    }

    static setOfflineCallback(callback: (src: string) => Promise<ArrayBuffer>): void {
      this.offlineCallback = callback;
    }
}