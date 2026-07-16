/**
 * Mock HTTP transport for provider runtime integration tests.
 */
function createMockTransport(handlers = []) {
  const queue = [...handlers];

  return async ({ method, url, headers, body }) => {
    const handler = queue.shift();
    if (!handler) {
      throw new Error(`No mock handler for ${method} ${url}`);
    }

    if (typeof handler === "function") {
      return handler({ method, url, headers, body });
    }

    if (handler.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, handler.delayMs));
    }

    if (handler.reject) {
      throw handler.reject;
    }

    return {
      status: handler.status ?? 200,
      headers: handler.headers || {},
      body: handler.body ?? {},
    };
  };
}

function oauthSuccess(body = {}) {
  return {
    status: 200,
    body: {
      access_token: "mock-access-token",
      token_type: "Bearer",
      expires_in: 3600,
      ...body,
    },
  };
}

function collectionAccepted() {
  return { status: 202, body: {} };
}

function collectionStatus(status = "SUCCESSFUL") {
  return {
    status: 200,
    body: { status, financialTransactionId: "fin-txn-123" },
  };
}

function createRoutingTransport(routes = []) {
  return async ({ method, url, headers, body }) => {
    for (const route of routes) {
      if (route.match({ method, url, headers, body })) {
        if (typeof route.respond === "function") {
          return route.respond({ method, url, headers, body });
        }
        return {
          status: route.status ?? 200,
          headers: route.headers || {},
          body: route.body ?? {},
        };
      }
    }
    throw new Error(`No mock route for ${method} ${url}`);
  };
}

function mtnMoMoSandboxRoutes() {
  return [
    {
      match: ({ url }) => url.includes("/collection/token/"),
      respond: () => oauthSuccess(),
    },
    {
      match: ({ url }) => url.includes("/disbursement/token/"),
      respond: () => oauthSuccess({ access_token: "mock-disbursement-token" }),
    },
    {
      match: ({ method, url }) => method === "POST" && url.includes("/requesttopay"),
      respond: () => collectionAccepted(),
    },
    {
      match: ({ method, url }) => method === "GET" && url.includes("/requesttopay"),
      respond: () => collectionStatus("SUCCESSFUL"),
    },
  ];
}

module.exports = {
  createMockTransport,
  createRoutingTransport,
  mtnMoMoSandboxRoutes,
  oauthSuccess,
  collectionAccepted,
  collectionStatus,
};
