const CommunicationInboxBridge = require("./CommunicationInboxBridge");
const PushNotificationService = require("./PushNotificationService");
const NotificationService = require("./NotificationService");
const MessagingService = require("./MessagingService");
const CommunicationOfferService = require("./CommunicationOfferService");
const CommunicationSocket = require("./CommunicationSocket");
const { NegotiatedPriceBridge, OrderCommunicationHooks } = require("./NegotiatedPriceBridge");

class CommunicationPlatform {
  constructor(options = {}) {
    this.options = options;
    this.inboxBridge = new CommunicationInboxBridge();
    this.pushService = new PushNotificationService();
    this.socket = new CommunicationSocket({});
    this.notificationService = new NotificationService({
      pushService: this.pushService,
      socketEmitter: this.socket,
    });
    this.messagingService = new MessagingService({
      inboxBridge: this.inboxBridge,
      notificationService: this.notificationService,
      socketEmitter: this.socket,
    });
    this.offerService = new CommunicationOfferService({
      inboxBridge: this.inboxBridge,
      notificationService: this.notificationService,
    });
    this.negotiatedPriceBridge = null;
    this.orderHooks = new OrderCommunicationHooks({ notificationService: this.notificationService });
    this.socket.notificationService = this.notificationService;
  }

  bindPricing(pricingService) {
    this.negotiatedPriceBridge = new NegotiatedPriceBridge({
      offerService: this.offerService,
      pricingService,
    });
  }

  bindOrderPlatform(orderPlatform) {
    this.orderHooks.register(orderPlatform);
  }

  attachSocket(server) {
    return this.socket.attach(server);
  }

  health() {
    return {
      status: "ok",
      pushEnabled: this.pushService.enabled,
      socketAttached: Boolean(this.socket.io),
    };
  }
}

let communicationPlatformInstance = null;

function createCommunicationPlatform(options = {}) {
  communicationPlatformInstance = new CommunicationPlatform(options);
  return communicationPlatformInstance;
}

function getCommunicationPlatform() {
  if (!communicationPlatformInstance) {
    throw new Error("Communication platform not initialized");
  }
  return communicationPlatformInstance;
}

module.exports = {
  CommunicationPlatform,
  createCommunicationPlatform,
  getCommunicationPlatform,
};
