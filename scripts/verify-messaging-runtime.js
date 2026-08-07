/**
 * Runtime verification for product messaging identity fix.
 * Usage: node scripts/verify-messaging-runtime.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
require("dotenv").config({ path: require("path").join(__dirname, "..", "config", ".env") });

const mongoose = require("mongoose");
const path = require("path");
const { io } = require(path.join(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "WEBSITE",
  "guriraline_app-main",
  "guriraline_app-main",
  "node_modules",
  "socket.io-client"
));

const API = "http://127.0.0.1:5000/api/v2";
const SOCKET = "http://127.0.0.1:5000";

const BUYER_EMAIL = process.env.E2E_BUYER_EMAIL;
const SELLER_EMAIL = process.env.E2E_SELLER_EMAIL;

async function api(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function waitForSocketEvent(socket, event, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for socket event: ${event}`)), timeoutMs);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

async function main() {
  if (!BUYER_EMAIL || !SELLER_EMAIL) {
    console.error("Set E2E_BUYER_EMAIL and E2E_SELLER_EMAIL in .env or the environment.");
    process.exit(1);
  }

  const User = require("../model/user");
  const Shop = require("../model/shop");
  const Product = require("../model/product");
  const Conversation = require("../model/conversation");
  const Message = require("../model/messages");
  const Notification = require("../model/notification");

  await mongoose.connect(process.env.DB_URL);
  console.log("MongoDB connected");

  const buyer = await User.findOne({ email: BUYER_EMAIL });
  const seller = await Shop.findOne({ email: SELLER_EMAIL });
  if (!buyer || !seller) {
    throw new Error(`Missing test users buyer=${BUYER_EMAIL} seller=${SELLER_EMAIL}`);
  }

  const buyerToken = buyer.getJwtToken();
  const sellerToken = seller.getJwtToken();
  const buyerId = String(buyer._id);
  const sellerId = String(seller._id);

  const product = await Product.findOne({ shopId: seller._id, stock: { $gt: 0 } }).lean();
  if (!product) throw new Error("No in-stock product for seller");

  const stamp = Date.now();
  const initialText = `Runtime verify ${stamp}`;

  console.log("\n=== IDs ===");
  console.log("buyerId:", buyerId);
  console.log("sellerId:", sellerId);
  console.log("productId:", String(product._id));

  const sellerSocket = io(SOCKET, {
    transports: ["websocket", "polling"],
    auth: { token: sellerToken },
  });
  await new Promise((resolve, reject) => {
    sellerSocket.on("connect", resolve);
    sellerSocket.on("connect_error", reject);
    setTimeout(() => reject(new Error("Seller socket connect timeout")), 10000);
  });
  console.log("\n=== Socket ===");
  console.log("sellerSocket.connected:", sellerSocket.connected);

  const sellerMessagePromise = waitForSocketEvent(sellerSocket, "getMessage");

  const createRes = await api("/marketplace/communication/conversations/product", {
    method: "POST",
    token: buyerToken,
    body: {
      productId: String(product._id),
      sellerId,
      productSnapshot: {
        productId: String(product._id),
        name: product.name,
        price: Number(product.discountPrice || product.originalPrice),
        image: product.images?.[0]?.url || null,
        shopId: sellerId,
      },
      initialMessage: initialText,
    },
  });

  console.log("\n=== Buyer → Product → Message Seller ===");
  console.log("POST /conversations/product status:", createRes.status);
  if (createRes.status !== 201) {
    throw new Error(`Create conversation failed: ${JSON.stringify(createRes.json)}`);
  }

  const conversationId = String(createRes.json.data._id);
  const firstMessage = createRes.json.data.lastMessage || createRes.json.data.messages?.[0];
  const messageId = String(firstMessage?._id || createRes.json.data.messageId || "");
  const senderId = String(firstMessage?.senderId || buyerId);
  const receiverId = sellerId;

  console.log("conversationId:", conversationId);
  console.log("messageId:", messageId);
  console.log("senderId:", senderId);
  console.log("receiverId:", receiverId);

  const socketPayload = await sellerMessagePromise;
  console.log("sellerSocket received getMessage:", Boolean(socketPayload));
  console.log("socket conversationId:", socketPayload?.conversationId);
  console.log("socket message text:", socketPayload?.message?.text || socketPayload?.text);

  const sellerUnreadRes = await api("/marketplace/communication/conversations/unread-count", {
    token: sellerToken,
  });
  console.log("\n=== Seller unread (shop JWT) ===");
  console.log("GET unread-count status:", sellerUnreadRes.status);
  console.log("unread count:", sellerUnreadRes.json?.data?.count);

  const buyerUnreadWrongRes = await api("/marketplace/communication/conversations/unread-count", {
    token: buyerToken,
  });
  const sellerListBuyerJwt = await api("/marketplace/communication/conversations", {
    token: buyerToken,
  });
  const sellerListShopJwt = await api("/marketplace/communication/conversations", {
    token: sellerToken,
  });
  const hasConvAsShop = (sellerListShopJwt.json?.data || []).some(
    (c) => String(c._id) === conversationId
  );
  const hasConvAsBuyer = (sellerListBuyerJwt.json?.data || []).some(
    (c) => String(c._id) === conversationId
  );

  console.log("\n=== Identity isolation ===");
  console.log("conversation visible with shop JWT:", hasConvAsShop);
  console.log("conversation visible with buyer JWT (same person):", hasConvAsBuyer);
  console.log("shop JWT conversation count:", (sellerListShopJwt.json?.data || []).length);
  console.log("buyer JWT conversation count:", (sellerListBuyerJwt.json?.data || []).length);

  const sellerReplyText = `Seller reply ${stamp}`;
  const buyerSocket = io(SOCKET, {
    transports: ["websocket", "polling"],
    auth: { token: buyerToken },
  });
  await new Promise((resolve, reject) => {
    buyerSocket.on("connect", resolve);
    buyerSocket.on("connect_error", reject);
    setTimeout(() => reject(new Error("Buyer socket connect timeout")), 10000);
  });
  const buyerMessagePromise = waitForSocketEvent(buyerSocket, "getMessage");

  const replyRes = await api(`/marketplace/communication/conversations/${conversationId}/messages`, {
    method: "POST",
    token: sellerToken,
    body: { text: sellerReplyText },
  });
  console.log("\n=== Seller reply ===");
  console.log("POST message status:", replyRes.status);
  console.log("reply messageId:", replyRes.json?.data?._id);
  console.log("reply senderId:", replyRes.json?.data?.senderId);
  console.log("reply receiverId (expected buyer):", buyerId);

  const buyerSocketPayload = await buyerMessagePromise;
  console.log("buyerSocket received getMessage:", Boolean(buyerSocketPayload));
  console.log("buyer socket text:", buyerSocketPayload?.message?.text || buyerSocketPayload?.text);

  const mongoConv = await Conversation.findById(conversationId).lean();
  const mongoMessages = await Message.find({ conversationId }).sort({ createdAt: 1 }).lean();
  const mongoNotif = await Notification.findOne({
    recipientId: sellerId,
    "payload.conversationId": conversationId,
  })
    .sort({ createdAt: -1 })
    .lean();

  console.log("\n=== MongoDB ===");
  console.log("conversation exists:", Boolean(mongoConv));
  console.log("members:", (mongoConv?.members || []).map(String));
  console.log("sellerId:", String(mongoConv?.sellerId));
  console.log("message count:", mongoMessages.length);
  console.log("latest messages:", mongoMessages.slice(-2).map((m) => ({ id: String(m._id), sender: String(m.senderId), text: m.text })));
  console.log("seller notification link:", mongoNotif?.link);

  const refreshBuyer = await api(`/marketplace/communication/conversations/${conversationId}/messages`, {
    token: buyerToken,
  });
  const refreshSeller = await api(`/marketplace/communication/conversations/${conversationId}/messages`, {
    token: sellerToken,
  });

  console.log("\n=== Refresh persistence ===");
  console.log("buyer GET messages status:", refreshBuyer.status, "count:", (refreshBuyer.json?.data || []).length);
  console.log("seller GET messages status:", refreshSeller.status, "count:", (refreshSeller.json?.data || []).length);

  sellerSocket.disconnect();
  buyerSocket.disconnect();
  await mongoose.disconnect();

  const checks = {
    create201: createRes.status === 201,
    sellerSocketGetMessage: Boolean(socketPayload?.conversationId || socketPayload?.message),
    sellerReply201: replyRes.status === 201,
    buyerSocketGetMessage: Boolean(buyerSocketPayload?.conversationId || buyerSocketPayload?.message),
    mongoConversation: Boolean(mongoConv),
    mongoMessages: mongoMessages.length >= 2,
    shopJwtSeesConversation: hasConvAsShop,
    sellerNotifLink: mongoNotif?.link?.includes("/dashboard-messages"),
    refreshBuyer200: refreshBuyer.status === 200,
    refreshSeller200: refreshSeller.status === 200,
  };

  console.log("\n=== PASS/FAIL ===");
  Object.entries(checks).forEach(([k, v]) => console.log(`${v ? "PASS" : "FAIL"} ${k}`));

  const allPass = Object.values(checks).every(Boolean);
  console.log("\nRESULT:", allPass ? "MESSAGING_FULLY_OPERATIONAL" : "MESSAGING_STILL_BROKEN");
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
