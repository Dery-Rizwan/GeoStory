const VAPID_PUBLIC_KEY = 'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk';

class PushHelper {
  constructor() {
    this.registration = null;
    this.subscription = null;
  }

  // Convert VAPID key to Uint8Array
  _urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Check if notifications are supported
  isSupported() {
    return 'Notification' in window && 
           'serviceWorker' in navigator && 
           'PushManager' in window;
  }

  // Check notification permission
  getPermission() {
    if (!this.isSupported()) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  // Request notification permission
  async requestPermission() {
    if (!this.isSupported()) {
      throw new Error('Push notifications are not supported in this browser');
    }

    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    
    return permission;
  }

  // Subscribe to push notifications
  async subscribe(serviceWorkerReg) {
    try {
      this.registration = serviceWorkerReg;

      // Check permission
      const permission = await this.requestPermission();
      
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // Check if already subscribed
      let subscription = await this.registration.pushManager.getSubscription();
      
      if (subscription) {
        console.log('Already subscribed to push notifications');
        this.subscription = subscription;
        return subscription;
      }

      // Subscribe to push
      const applicationServerKey = this._urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      
      subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      this.subscription = subscription;
      
      console.log('Subscribed to push notifications:', subscription);
      
      // Save subscription status to localStorage
      localStorage.setItem('pushSubscribed', 'true');
      
      return subscription;
      
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe() {
    try {
      if (!this.subscription) {
        const reg = await navigator.serviceWorker.ready;
        this.subscription = await reg.pushManager.getSubscription();
      }

      if (!this.subscription) {
        console.log('No active subscription found');
        return true;
      }

      const successful = await this.subscription.unsubscribe();
      
      if (successful) {
        console.log('Unsubscribed from push notifications');
        this.subscription = null;
        localStorage.removeItem('pushSubscribed');
      }
      
      return successful;
      
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      throw error;
    }
  }

  // Check if currently subscribed
  async isSubscribed() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      return !!subscription;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }

  // Get current subscription
  async getSubscription() {
    try {
      const reg = await navigator.serviceWorker.ready;
      return await reg.pushManager.getSubscription();
    } catch (error) {
      console.error('Error getting subscription:', error);
      return null;
    }
  }

  // Show a local notification (for testing)
  async showLocalNotification(title, options = {}) {
    if (!this.isSupported()) {
      console.warn('Notifications not supported');
      return;
    }

    const permission = await this.requestPermission();
    
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    const reg = await navigator.serviceWorker.ready;
    
    await reg.showNotification(title, {
      body: options.body || 'This is a test notification',
      icon: options.icon || '/icons/icon-192x192.png',
      badge: options.badge || '/icons/icon-72x72.png',
      tag: options.tag || 'test-notification',
      requireInteraction: false,
      ...options
    });
  }

  // Test push notification
  async testNotification() {
    await this.showLocalNotification('Test Notification 🔔', {
      body: 'Push notifications are working! You will be notified when new stories are posted.',
      tag: 'test',
      actions: [
        {
          action: 'explore',
          title: 'Explore Stories'
        }
      ]
    });
  }
}

// Create singleton instance
const pushHelper = new PushHelper();

export default pushHelper;