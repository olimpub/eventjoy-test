import * as signalR from '@microsoft/signalr';

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  // TODO: Később kapcsoljuk be (true-ra), amikor a backend / Azure Function router be van állítva
  private SIGNALR_ENABLED = false; 

  constructor() {
    if (this.SIGNALR_ENABLED) {
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl('http://localhost:9000/hubs/eventjoy') // TODO: Configból olvasni
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Warning) // Ne spammelje tele a konzolt
        .build();
    }
  }

  public async startConnection() {
    if (!this.SIGNALR_ENABLED || !this.connection) {
      console.log('SignalR is disabled via configuration. Skipping startConnection.');
      return;
    }

    try {
      if (this.connection.state === signalR.HubConnectionState.Disconnected) {
        await this.connection.start();
        console.log('SignalR Connected.');
        this.registerListeners();
      }
    } catch (err) {
      console.warn('SignalR Connection Error: Várható hiba, amíg a backend nincs felkonfigurálva.', err);
      // Itt csendben elnyeljük a hibát, hogy ne omoljon össze a frontend
    }
  }

  public stopConnection() {
    if (this.connection && this.connection.state !== signalR.HubConnectionState.Disconnected) {
      this.connection.stop().then(() => {
        console.log('SignalR Disconnected.');
      }).catch(err => {
        console.warn('Hiba a SignalR leállításakor: ', err);
      });
    }
  }

  private registerListeners() {
    if (!this.connection) return;

    // Példa: Élő esemény frissítése
    this.connection.on('ReceiveEventUpdate', (data: any) => {
      console.log('ReceiveEventUpdate:', data);
      // Itt hívnánk meg a megfelelő Pinia store action-t, pl. useEventStore().updateEventStatus(...)
    });

    // Példa: Új chat üzenet (kvíz válasz, stb.)
    this.connection.on('ReceiveNewMessage', (data: any) => {
      console.log('ReceiveNewMessage:', data);
    });
  }
}

export const signalRService = new SignalRService();
