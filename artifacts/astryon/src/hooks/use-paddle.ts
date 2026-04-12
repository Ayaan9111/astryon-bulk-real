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
    console.warn("VITE_PADDLE_CLIENT_TOKEN is not set");
    return;
  }
  window.Paddle.Initialize({ token });
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
    console.error("Paddle.js not loaded");
    return;
  }

  window.Paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customer: email ? { email } : undefined,
    settings: {
      displayMode: "overlay",
      theme: "dark",
    },
    successCallback: onSuccess,
  });
}
