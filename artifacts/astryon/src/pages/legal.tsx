import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Mail } from "lucide-react";

const SUPPORT_EMAIL = "support@astryon.in";
const LAST_UPDATED = "April 2026";

function LegalLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-32">
        <h1 className="text-3xl font-display font-bold text-white mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: {LAST_UPDATED}</p>
        <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-white mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function Privacy() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>
        Astryón ("we", "us", or "our") operates the Astryón platform, a SaaS tool for AI-powered
        real estate listing generation. This Privacy Policy explains how we collect, use, and
        protect your information when you use our service.
      </p>

      <Section title="1. Information We Collect">
        <p>
          <span className="text-white font-medium">Account information:</span> When you register,
          we collect your name and email address.
        </p>
        <p>
          <span className="text-white font-medium">Usage data:</span> We collect information about
          how you use Astryón, including the number of credits used, generation history, and
          feature interactions.
        </p>
        <p>
          <span className="text-white font-medium">Property data:</span> The CSV files and property
          details you upload are processed to generate listing descriptions. This data is not stored
          permanently beyond what is needed to display your generation history.
        </p>
        <p>
          <span className="text-white font-medium">Payment information:</span> Payments are
          processed by Paddle. We do not store your credit card or payment details on our servers.
        </p>
      </Section>

      <Section title="2. How We Use Your Information">
        <p>We use your information to:</p>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <li>Provide, operate, and maintain the Astryón service</li>
          <li>Process your subscription and manage your account</li>
          <li>Improve and develop new features</li>
          <li>Respond to support requests and communicate with you</li>
          <li>Detect and prevent fraud or abuse</li>
        </ul>
      </Section>

      <Section title="3. Third-Party Services">
        <p>
          We use the following third-party services to operate Astryón:
        </p>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <li><span className="text-white font-medium">Paddle</span> — for subscription billing and payment processing</li>
          <li><span className="text-white font-medium">Groq</span> — for AI-powered listing generation</li>
        </ul>
        <p>
          These services have their own privacy policies and data handling practices. We encourage
          you to review them independently.
        </p>
      </Section>

      <Section title="4. Data Retention">
        <p>
          We retain your account information and generation history for as long as your account is
          active. You may request deletion of your account and data by contacting us at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>.
        </p>
      </Section>

      <Section title="5. Data Security">
        <p>
          We implement appropriate technical and organisational measures to protect your data
          against unauthorised access, alteration, or destruction. All data is transmitted over
          encrypted HTTPS connections.
        </p>
      </Section>

      <Section title="6. We Do Not Sell Your Data">
        <p>
          Astryón does not sell, rent, or trade your personal information to third parties for
          their marketing purposes.
        </p>
      </Section>

      <Section title="7. Your Rights">
        <p>
          You have the right to access, correct, or delete your personal data. To exercise these
          rights, contact us at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>.
        </p>
      </Section>

      <Section title="8. Contact">
        <p>
          For privacy-related questions, email us at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>.
        </p>
      </Section>
    </LegalLayout>
  );
}

export function Terms() {
  return (
    <LegalLayout title="Terms of Service">
      <p>
        These Terms of Service govern your use of Astryón, a SaaS platform that uses artificial
        intelligence to generate real estate listing descriptions. By creating an account or using
        the service, you agree to these terms.
      </p>

      <Section title="1. About Astryón">
        <p>
          Astryón is a subscription-based tool that allows real estate agents and agencies to
          bulk-generate AI-written property listing descriptions from CSV files. Access is granted
          through paid subscription plans.
        </p>
      </Section>

      <Section title="2. Eligibility">
        <p>
          You must be at least 18 years old and capable of forming a legally binding agreement to
          use Astryón. By using the service, you represent that you meet these requirements.
        </p>
      </Section>

      <Section title="3. Accounts">
        <p>
          You are responsible for maintaining the confidentiality of your account credentials and
          for all activity that occurs under your account. Notify us immediately at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>{" "}
          if you suspect unauthorised access.
        </p>
      </Section>

      <Section title="4. Use of the Service">
        <p>You agree not to:</p>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <li>Use Astryón to generate false, misleading, or illegal content</li>
          <li>Resell, sublicense, or redistribute the Astryón service itself</li>
          <li>Attempt to reverse-engineer or extract proprietary methods from the platform</li>
          <li>Abuse the credit system or exploit any pricing errors</li>
        </ul>
        <p>
          Generated descriptions may be used for commercial real estate purposes. You are fully
          responsible for reviewing and validating all AI-generated content before publishing it.
        </p>
      </Section>

      <Section title="5. Credits and Subscriptions">
        <p>
          Astryón operates on a credit-based subscription model. Credits are consumed per listing
          generated and reset at the start of each billing cycle. Unused credits do not roll over
          to the next period.
        </p>
        <p>
          Subscriptions automatically renew unless cancelled before the renewal date.
        </p>
      </Section>

      <Section title="6. Account Suspension">
        <p>
          Astryón reserves the right to suspend or terminate accounts that violate these terms,
          engage in abusive behaviour, fraudulent activity, or misuse of the service, without
          prior notice.
        </p>
      </Section>

      <Section title="7. No Guarantee of Uninterrupted Service">
        <p>
          Astryón is provided "as is." We do not guarantee uninterrupted, error-free, or
          perfectly accurate service. AI-generated content may occasionally be imperfect, and it
          is your responsibility to review all output before use.
        </p>
      </Section>

      <Section title="8. Limitation of Liability">
        <p>
          To the maximum extent permitted by law, Astryón shall not be liable for any indirect,
          incidental, or consequential damages arising from your use of the service.
        </p>
      </Section>

      <Section title="9. Changes to Terms">
        <p>
          We may update these terms from time to time. Continued use of Astryón after changes are
          posted constitutes acceptance of the revised terms.
        </p>
      </Section>

      <Section title="10. Contact">
        <p>
          Questions about these terms? Email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>.
        </p>
      </Section>
    </LegalLayout>
  );
}

export function Refund() {
  return (
    <LegalLayout title="Refund Policy">
      <p>
        At Astryón, we want you to be satisfied with your subscription. This Refund Policy explains
        the conditions under which refunds are available.
      </p>

      <Section title="1. 14-Day Refund Window">
        <p>
          We offer a full refund on your first subscription payment if requested within{" "}
          <span className="text-white font-medium">14 days</span> of the original purchase date.
          To qualify, you must contact us at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>{" "}
          with your account email and reason for the refund request.
        </p>
      </Section>

      <Section title="2. How to Request a Refund">
        <p>
          Email <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>{" "}
          with the subject line <span className="text-white font-medium">"Refund Request"</span> and
          include your registered email address and a brief reason. We aim to respond within 2
          business days.
        </p>
      </Section>

      <Section title="3. No Refunds on Renewals">
        <p>
          Refunds are only available for the initial subscription payment. Automatic renewal charges
          are non-refundable. If you wish to avoid future charges, please cancel your subscription
          before the renewal date.
        </p>
      </Section>

      <Section title="4. Abuse and Exceptions">
        <p>
          Astryón reserves the right to refuse a refund if there is evidence of abuse of this
          policy, such as repeated refund requests, or if the account is found to have violated
          our Terms of Service.
        </p>
      </Section>

      <Section title="5. Cancellation">
        <p>
          You may cancel your subscription at any time from your account page. Cancellation stops
          future renewals but does not affect access for the remainder of the current billing period.
        </p>
      </Section>

      <Section title="6. Contact">
        <p>
          For all refund requests, email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>.
          We are here to help.
        </p>
      </Section>
    </LegalLayout>
  );
}

export function Contact() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-6 py-32">
        <div className="max-w-md w-full text-center space-y-8">
          <div>
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
              <Mail className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-3xl font-display font-bold text-white mb-3">Contact Us</h1>
            <p className="text-muted-foreground">
              Have a question, issue, or feedback? We'd love to hear from you.
              Reach out and we'll get back to you within 1–2 business days.
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-8 border border-white/10 space-y-4">
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Support Email</p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-xl font-semibold text-primary hover:underline block"
            >
              {SUPPORT_EMAIL}
            </a>
            <p className="text-xs text-muted-foreground pt-2">
              For billing issues, refund requests, or general questions about Astryón.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Astryón. All rights reserved.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
