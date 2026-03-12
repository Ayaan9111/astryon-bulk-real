import { Navbar } from "@/components/layout/Navbar";

export function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-32 prose prose-invert prose-p:text-muted-foreground prose-h1:text-white prose-h2:text-white">
        <h1>Privacy Policy</h1>
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        <h2>1. Information We Collect</h2>
        <p>We collect information you provide directly to us, including your name, email address, and real estate data uploaded via CSV for generation purposes.</p>
        <h2>2. How We Use Your Information</h2>
        <p>We use the information we collect to provide, maintain, and improve our services, specifically to generate real estate descriptions via AI models.</p>
        <h2>3. Data Security</h2>
        <p>We implement appropriate technical and organizational security measures to protect your data against unauthorized access, modification, or destruction.</p>
      </main>
    </div>
  );
}

export function Terms() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-32 prose prose-invert prose-p:text-muted-foreground prose-h1:text-white prose-h2:text-white">
        <h1>Terms of Service</h1>
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using Astryón, you agree to be bound by these Terms of Service and all applicable laws and regulations.</p>
        <h2>2. Use License</h2>
        <p>You may use generated content for commercial real estate purposes. You may not resell the generation service itself.</p>
        <h2>3. Credits and Billing</h2>
        <p>Subscription credits expire at the end of each billing cycle and do not roll over. All fees are non-refundable except as required by law.</p>
      </main>
    </div>
  );
}

export function Refund() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-32 prose prose-invert prose-p:text-muted-foreground prose-h1:text-white prose-h2:text-white">
        <h1>Refund Policy</h1>
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        <h2>1. General Policy</h2>
        <p>We offer a 14-day money-back guarantee for your first subscription payment if you are unsatisfied with the generated output and have used less than 10 credits.</p>
        <h2>2. Recurring Subscriptions</h2>
        <p>You can cancel your subscription at any time. Cancellations apply to the next billing cycle. We do not provide prorated refunds for mid-cycle cancellations.</p>
        <h2>3. Contact</h2>
        <p>To request a refund, please contact support via the Account dashboard feedback form or email support@astryon.com.</p>
      </main>
    </div>
  );
}
