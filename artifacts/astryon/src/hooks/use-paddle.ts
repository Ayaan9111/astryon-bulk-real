declare global {
  interface Window {
    Paddle: any;
  }
}

let initialized = false;

function initPaddle() {
  if (initialized || typeof window === "undefined" || !window.Paddle) return;
  const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
  if (!token) {
    console.error("[Paddle] VITE_PADDLE_CLIENT_TOKEN is not set");
    return;
  }
  window.Paddle.Initialize({
    token,
    eventCallback(event: any) {
      console.log("[Paddle event]", event.name, event.data ?? event);
      if (event.name === "checkout.error") {
        console.error("[Paddle checkout.error]", JSON.stringify(event.data, null, 2));
      }
    },
  });
  initialized = true;
}

export function openPaddleCheckout({
  priceId,
  email,
  onSuccess,
}: {
  priceId: string;
  email?: string;
  onSuccess?: () => void;
}) {
  initPaddle();

  if (!window.Paddle) {
    console.error("[Paddle] Paddle.js not loaded");
    return;
  }

  console.log("[Paddle] Opening checkout for priceId:", priceId);

  window.Paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    ...(email ? { customer: { email } } : {}),
    settings: {
      displayMode: "overlay",
      theme: "dark",
    },
    ...(onSuccess ? { successUrl: undefined } : {}),
  });
}
