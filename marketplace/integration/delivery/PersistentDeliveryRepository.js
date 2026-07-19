const DeliveryRepository = require("../../delivery/DeliveryRepository");
const DeliveryRecord = require("../../../model/deliveryRecord");

/**
 * Extends in-memory delivery store with Mongo persistence — preserves sync API.
 */
class PersistentDeliveryRepository extends DeliveryRepository {
  constructor({ persist = true } = {}) {
    super();
    this.persist = persist;
  }

  async hydrateFromDatabase() {
    if (!this.persist) return;
    const docs = await DeliveryRecord.find().lean();
    for (const doc of docs) {
      const record = {
        deliveryId: doc.deliveryId,
        orderId: doc.orderId,
        customerId: doc.customerId,
        vendorId: doc.vendorId,
        courierId: doc.courierId,
        pickupAddress: doc.pickupAddress,
        deliveryAddress: doc.deliveryAddress,
        deliveryFee: doc.deliveryFee,
        status: doc.status,
        trackingNumber: doc.trackingNumber,
        createdAt: doc.createdAt?.toISOString?.() || new Date().toISOString(),
        updatedAt: doc.updatedAt?.toISOString?.() || new Date().toISOString(),
        metadata: doc.metadata || {},
      };
      this.deliveries.set(record.deliveryId, record);
      this.byTracking.set(record.trackingNumber, record.deliveryId);
      this.byOrder.set(record.orderId, record.deliveryId);
    }
  }

  _persist(record) {
    if (!this.persist) return;
    DeliveryRecord.findOneAndUpdate(
      { deliveryId: record.deliveryId },
      {
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
      },
      { upsert: true, new: true }
    ).catch((error) => {
      console.error("Delivery persistence failed:", error.message);
    });
  }

  create(record) {
    const created = super.create(record);
    this._persist(created);
    return created;
  }

  update(deliveryId, patch) {
    const updated = super.update(deliveryId, patch);
    if (updated) this._persist(updated);
    return updated;
  }
}

module.exports = PersistentDeliveryRepository;
