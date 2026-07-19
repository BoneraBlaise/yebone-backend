const crypto = require("crypto");
const DeliveryRecord = require("../../../model/deliveryRecord");

class MongoDeliveryRepository {
  constructor() {
    this._trackingCache = new Map();
  }

  generateDeliveryId() {
    return `dlv_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  }

  _clone(record) {
    return record ? JSON.parse(JSON.stringify(record)) : null;
  }

  _toRecord(doc) {
    if (!doc) return null;
    const plain = doc.toObject ? doc.toObject() : doc;
    return {
      deliveryId: plain.deliveryId,
      orderId: plain.orderId,
      customerId: plain.customerId,
      vendorId: plain.vendorId,
      courierId: plain.courierId,
      pickupAddress: plain.pickupAddress,
      deliveryAddress: plain.deliveryAddress,
      deliveryFee: plain.deliveryFee,
      status: plain.status,
      trackingNumber: plain.trackingNumber,
      createdAt: plain.createdAt?.toISOString?.() || plain.createdAt,
      updatedAt: plain.updatedAt?.toISOString?.() || plain.updatedAt,
      metadata: plain.metadata || {},
    };
  }

  create(record) {
    return DeliveryRecord.create({
      deliveryId: record.deliveryId,
      orderId: record.orderId,
      customerId: record.customerId,
      vendorId: record.vendorId,
      courierId: record.courierId,
      pickupAddress: record.pickupAddress,
      deliveryAddress: record.deliveryAddress,
      deliveryFee: record.deliveryFee,
      status: record.status,
      trackingNumber: record.trackingNumber,
      metadata: record.metadata || {},
    }).then((doc) => this._toRecord(doc));
  }

  findById(deliveryId) {
    return DeliveryRecord.findOne({ deliveryId }).then((doc) => this._toRecord(doc));
  }

  findByTrackingNumber(trackingNumber) {
    return DeliveryRecord.findOne({ trackingNumber }).then((doc) => this._toRecord(doc));
  }

  findByOrderId(orderId) {
    return DeliveryRecord.findOne({ orderId: String(orderId) }).then((doc) => this._toRecord(doc));
  }

  trackingExists(trackingNumber) {
    return DeliveryRecord.exists({ trackingNumber }).then(Boolean);
  }

  orderHasDelivery(orderId) {
    return DeliveryRecord.exists({ orderId: String(orderId) }).then(Boolean);
  }

  update(deliveryId, patch = {}) {
    return DeliveryRecord.findOneAndUpdate(
      { deliveryId },
      { $set: patch },
      { new: true }
    ).then((doc) => this._toRecord(doc));
  }

  list(filters = {}) {
    const query = {};
    if (filters.customerId) query.customerId = String(filters.customerId);
    if (filters.vendorId) query.vendorId = String(filters.vendorId);
    if (filters.courierId) query.courierId = String(filters.courierId);
    if (filters.orderId) query.orderId = String(filters.orderId);
    if (filters.status) query.status = filters.status;

    return DeliveryRecord.find(query).sort({ createdAt: -1 }).then((docs) =>
      docs.map((doc) => this._toRecord(doc))
    );
  }
}

module.exports = MongoDeliveryRepository;
