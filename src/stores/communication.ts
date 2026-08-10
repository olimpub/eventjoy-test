import { defineStore } from 'pinia';

export const useCommunicationStore = defineStore('communication', {
  state: () => ({
    notifications: [] as any[],
    chatThreads: [] as any[], // Lekerült szerverről: [{ ChatThreadID: 1, LastReadMessageID: 100 }]
    localUnreadCounts: {} as Record<number, number> // Kliens számolja: { [ChatThreadID]: unread_count }
  }),
  getters: {
    totalUnreadNotifications: (state) => state.notifications.filter(n => !n.IsRead).length,
    totalUnreadChats: (state) => {
      let sum = 0;
      for (const count of Object.values(state.localUnreadCounts)) {
        sum += count;
      }
      return sum;
    },
  },
  actions: {
    setNotifications(notifs: any[]) {
      this.notifications = notifs;
    },
    setChatThreads(threads: any[]) {
      this.chatThreads = threads;
      // Itt inicializáljuk a helyi unread countokat
      threads.forEach(t => {
        if (this.localUnreadCounts[t.ChatThreadID] === undefined) {
           this.localUnreadCounts[t.ChatThreadID] = 0; // Később itt számoljuk ki a letöltött üzenetekből
        }
      });
    },
    
    // --- SignalR által meghívott akciók --- //
    
    addNotification(notification: any) {
      // Új értesítés jött élőben
      this.notifications.unshift(notification);
    },
    
    handleNewChatMessage(threadId: number, messageId: number) {
      // Új üzenet jött élőben
      const thread = this.chatThreads.find(c => c.ChatThreadID === threadId);
      
      // Kliens oldali (Client-Driven) badge kalkuláció!
      if (!thread || messageId > (thread.LastReadMessageID || 0)) {
         this.localUnreadCounts[threadId] = (this.localUnreadCounts[threadId] || 0) + 1;
      }
    },
    
    markThreadAsRead(threadId: number, latestMessageId: number) {
      // Felhasználó belépett az ablakba
      const thread = this.chatThreads.find(c => c.ChatThreadID === threadId);
      if (thread) {
        thread.LastReadMessageID = latestMessageId;
      } else {
        this.chatThreads.push({ ChatThreadID: threadId, LastReadMessageID: latestMessageId });
      }
      this.localUnreadCounts[threadId] = 0;
      
      // IDE JÖN a háttér FYI (For Your Information) hívás a szerver felé!
      // api.post('/api/chat/mark-read', { ThreadID: threadId, MessageID: latestMessageId });
    }
  }
});
