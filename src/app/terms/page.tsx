import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata = {
  title: "Terms of Service – MailScope",
  description: "The terms and conditions governing your use of MailScope.",
};

const LAST_UPDATED = "June 27, 2026";

export default function TermsPage() {
  return (
    <div className="bg-grid flex flex-1 flex-col" style={{ color: "var(--text-primary)" }}>
      <header className="sticky top-0 z-50 glass-strong border-b" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo href="/" />
          <Link href="/" className="text-sm transition hover:text-blue-400" style={{ color: "var(--text-muted)" }}>
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <div className="glass rounded-2xl p-8 sm:p-12 space-y-8">

          <div>
            <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
            <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
              Last updated: {LAST_UPDATED}
            </p>
          </div>

          <Section title="Overview">
            <p>
              These Terms of Service (&ldquo;Terms&rdquo;) govern your use of MailScope, an AI-powered
              Gmail triage application (&ldquo;Service&rdquo;). By accessing or using MailScope you
              agree to be bound by these Terms. If you do not agree, do not use the Service.
            </p>
          </Section>

          <Section title="1. Eligibility">
            <p>
              You must be at least 13 years old to use MailScope. By using the Service you represent
              that you meet this requirement and have the authority to enter into these Terms.
            </p>
          </Section>

          <Section title="2. Your account">
            <p>
              MailScope uses Google OAuth to authenticate you. You are responsible for maintaining the
              security of your Google account. You must notify us immediately if you suspect unauthorised
              access to your MailScope account. We are not liable for any loss resulting from your
              failure to keep your credentials secure.
            </p>
          </Section>

          <Section title="3. Acceptable use">
            <p>You agree not to:</p>
            <ul className="mt-2 space-y-1 pl-5 list-disc text-sm" style={{ color: "var(--text-secondary)" }}>
              <li>Use MailScope for any unlawful purpose or in violation of any regulation.</li>
              <li>Attempt to reverse-engineer, decompile, or extract source code from the Service.</li>
              <li>Interfere with or disrupt the integrity or performance of the Service.</li>
              <li>Use automated means to access the Service in a way that exceeds reasonable usage.</li>
              <li>Share your account credentials with others.</li>
              <li>Use the Service to process email accounts you do not own or have permission to access.</li>
            </ul>
          </Section>

          <Section title="4. Gmail and Google API">
            <p>
              MailScope connects to your Gmail account using Google&apos;s official API with read-only
              access. We never send, move, delete, or modify any emails or Gmail data on your behalf.
              Your use of Google services is also governed by{" "}
              <a
                href="https://policies.google.com/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Google&apos;s Terms of Service
              </a>
              .
            </p>
          </Section>

          <Section title="5. Third-party AI providers">
            <p>
              If you configure an AI provider API key (OpenAI, Anthropic, Google Gemini, or
              OpenRouter), your email metadata is sent to that provider to classify emails. Your use
              of those providers is governed by their own terms of service. MailScope is not
              responsible for the outputs of third-party AI models or for any costs incurred through
              your API key usage.
            </p>
          </Section>

          <Section title="6. Intellectual property">
            <p>
              The MailScope application, branding, and all content we create are owned by or licensed
              to us. You retain full ownership of your own email data. We do not claim any rights to
              your emails or account information beyond what is necessary to provide the Service.
            </p>
          </Section>

          <Section title="7. Privacy">
            <p>
              Your use of MailScope is also governed by our{" "}
              <Link href="/privacy" className="text-blue-400 hover:underline">
                Privacy Policy
              </Link>
              , which is incorporated into these Terms by reference.
            </p>
          </Section>

          <Section title="8. Disclaimers">
            <p>
              MailScope is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without
              warranties of any kind, express or implied. We do not warrant that the Service will be
              uninterrupted, error-free, or that AI classifications will be accurate. Email triage is
              automated and may misclassify messages — you should always review your inbox independently
              for critical communications.
            </p>
          </Section>

          <Section title="9. Limitation of liability">
            <p>
              To the fullest extent permitted by law, MailScope and its operators shall not be liable
              for any indirect, incidental, special, consequential, or punitive damages arising from
              your use of or inability to use the Service, including any misclassification of emails
              or missed communications.
            </p>
            <p className="mt-2">
              Our total liability to you for any claim arising from these Terms or the Service shall
              not exceed the amount you paid us in the 12 months preceding the claim (or $0 if the
              Service is free to you).
            </p>
          </Section>

          <Section title="10. Termination">
            <p>
              You may stop using MailScope and delete your account at any time from{" "}
              <Link href="/settings" className="text-blue-400 hover:underline">
                Settings → Danger Zone
              </Link>
              . We may suspend or terminate your access if you violate these Terms, with or without
              notice. Upon termination, we will delete your data in accordance with our{" "}
              <Link href="/privacy" className="text-blue-400 hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </Section>

          <Section title="11. Changes to these Terms">
            <p>
              We may update these Terms from time to time. Material changes will be communicated via
              email or an in-app notice. Your continued use of the Service after changes are posted
              constitutes acceptance of the new Terms.
            </p>
          </Section>

          <Section title="12. Governing law">
            <p>
              These Terms are governed by the laws of the United States, without regard to conflict
              of law principles. Any disputes arising under these Terms shall be resolved in the
              courts of the applicable jurisdiction.
            </p>
          </Section>

          <Section title="13. Contact">
            <p>
              Questions about these Terms? Email us at{" "}
              <a href="mailto:georgeakaing@gmail.com" className="text-blue-400 hover:underline">
                georgeakaing@gmail.com
              </a>
              .
            </p>
          </Section>

        </div>
      </main>

      <footer className="border-t py-6 text-center text-xs space-x-4" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
        <Link href="/privacy" className="hover:text-blue-400">Privacy Policy</Link>
        <span>·</span>
        <Link href="/terms" className="hover:text-blue-400">Terms of Service</Link>
        <span>·</span>
        <span>MailScope</span>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {children}
      </div>
    </section>
  );
}
