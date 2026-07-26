const PushSubscription = require("../../model/pushSubscription");

class PushNotificationService {
  constructor() {
    this.webpush = null;
    this.enabled = false;
    this._init();
  }

  _init() {
    try {
      this.webpush = require("web-push");
      const publicKey = process.env.VAPID_PUBLIC_KEY;
      const privateKey = process.env.VAPID_PRIVATE_KEY;
      const subject = process.env.VAPID_SUBJECT || "mailto:support@yebone.com";
      if (publicKey && privateKey) {
        this.webpush.setVapidDetails(subject, publicKey, privateKey);
        this.enabled = true;
      }
    } catch (_error) {
      this.enabled = false;
    }
  }

  getPublicKey() {
    return process.env.VAPID_PUBLIC_KEY || null;
  }

  async saveSubscription(userId, subscription, userAgent = null) {
    if (!subscription?.endpoint || !subscription?.keys) {
      const error = new Error("Invalid push subscription");
      error.statusCode = 400;
      throw error;
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        userId: String(userId),
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userAgent,
      },
      { upsert: true, new: true }
    );
    return { success: true };
  }

  async removeSubscription(userId, endpoint) {
    await PushSubscription.deleteOne({ userId: String(userId), endpoint });
    return { success: true };
  }

  async sendToUser(userId, payload = {}) {
    if (!this.enabled || !this.webpush) return { sent: 0, skipped: true };

    const subscriptions = await PushSubscription.find({ userId: String(userId) }).lean();
    let sent = 0;
    for (const sub of subscriptions) {
      try {
        await this.webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify({
            title: payload.title,
            body: payload.body,
            link: payload.link,
            data: payload.data || {},
          })
        );
        sent += 1;
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          await PushSubscription.deleteOne({ endpoint: sub.endpoint });
        }
      }
    }
    return { sent };
  }
}

module.exports = PushNotificationService;
