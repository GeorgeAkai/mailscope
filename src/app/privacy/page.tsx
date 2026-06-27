import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata = {
  title: "Privacy Policy – MailScope",
  description: "How MailScope collects, uses, and protects your data.",
};

const LAST_UPDATED = "June 27, 2026";

export default function PrivacyPage() {
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
            <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
            <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
              Last updated: {LAST_UPDATED}
            </p>
          </div>

          <Section title="Overview">
            <p>
              MailScope (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is an AI-powered Gmail triage tool.
              This Privacy Policy explains what data we collect when you use MailScope, how we use it,
              and the choices you have. We take your privacy seriously — especially given that email data
              is sensitive.
            </p>
          </Section>

          <Section title="1. Data we collect">
            <Subsection title="Google account information">
              When you sign in with Google we receive your name, email address, and a profile picture URL
              via Google OAuth. We store your email address to identify your account and your name to
              personalise the interface.
            </Subsection>
            <Subsection title="Gmail metadata">
              MailScope accesses your Gmail inbox using Google&apos;s official Gmail API with
              <strong> read-only</strong> permission. We store the following fields from each email:
            </Subsection>
            <ul className="mt-2 space-y-1 pl-5 text-sm list-disc" style={{ color: "var(--text-secondary)" }}>
              <li>Gmail message ID and thread ID</li>
              <li>Sender name and email address</li>
              <li>Subject line</li>
              <li>Email snippet (first ~200 characters as provided by Gmail)</li>
              <li>A text preview of the body (used for AI classification)</li>
              <li>Received timestamp and read/unread status</li>
            </ul>
            <p className="mt-3">
              <strong>We do not store full email bodies, attachments, or any media.</strong>
            </p>
            <Subsection title="AI classification data">
              When you configure an AI provider key (OpenAI, Anthropic, Google Gemini, or OpenRouter),
              the email metadata listed above is sent to that provider to classify the email. Your API
              key is stored encrypted in our database and is only transmitted directly to your chosen
              provider. We do not store or log AI provider responses beyond the resulting category and
              importance score.
            </Subsection>
            <Subsection title="Settings and preferences">
              We store your sync interval preference, scan window (days), selected AI provider, and
              category configuration.
            </Subsection>
          </Section>

          <Section title="2. How we use your data">
            <ul className="space-y-2 pl-5 list-disc text-sm" style={{ color: "var(--text-secondary)" }}>
              <li>To authenticate you and associate your Gmail data with your account.</li>
              <li>To fetch, classify, and display your emails in the priority inbox.</li>
              <li>To power the RAG chatbot, which searches your stored email metadata to answer questions.</li>
              <li>To run scheduled email syncs at the interval you configure.</li>
              <li>To improve classification accuracy when you manually override a category.</li>
            </ul>
            <p className="mt-3">
              We do not sell your data, use it for advertising, or share it with third parties other
              than the AI provider you explicitly configure.
            </p>
          </Section>

          <Section title="3. Data storage and security">
            <p>
              Your data is stored in a PostgreSQL database hosted on Neon (neon.tech), a serverless
              Postgres provider. Data is encrypted at rest and in transit. Your AI provider API key is
              stored encrypted and is never exposed in API responses or logs.
            </p>
            <p className="mt-2">
              We take reasonable technical and organisational measures to protect your data, but no
              system is perfectly secure. We will notify you promptly of any breach that affects your
              personal data.
            </p>
          </Section>

          <Section title="4. Data retention and deletion">
            <p>
              We retain your data for as long as your account is active. You can delete all your data
              at any time from{" "}
              <Link href="/settings" className="text-blue-400 hover:underline">
                Settings → Danger Zone → Delete account
              </Link>
              . This permanently removes your account, all stored email metadata, tasks, and your API
              key from our database.
            </p>
          </Section>

          <Section title="5. Google API scopes">
            <p>MailScope requests the following Google OAuth scopes:</p>
            <ul className="mt-2 space-y-1 pl-5 list-disc text-sm" style={{ color: "var(--text-secondary)" }}>
              <li><code className="rounded bg-slate-500/20 px-1 py-0.5 text-xs">openid</code> — verify your identity</li>
              <li><code className="rounded bg-slate-500/20 px-1 py-0.5 text-xs">email</code> — read your email address</li>
              <li><code className="rounded bg-slate-500/20 px-1 py-0.5 text-xs">profile</code> — read your name and profile picture</li>
              <li><code className="rounded bg-slate-500/20 px-1 py-0.5 text-xs">https://www.googleapis.com/auth/gmail.readonly</code> — read your Gmail messages and metadata</li>
            </ul>
            <p className="mt-3">
              MailScope&apos;s use of Google user data complies with the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
          </Section>

          <Section title="6. Cookies and analytics">
            <p>
              MailScope uses a single session cookie to keep you signed in. We do not use
              third-party analytics, tracking pixels, or advertising cookies.
            </p>
          </Section>

          <Section title="7. Children's privacy">
            <p>
              MailScope is not directed at children under 13. We do not knowingly collect personal
              information from children under 13. If you believe a child has provided us with data,
              please contact us and we will delete it.
            </p>
          </Section>

          <Section title="8. Changes to this policy">
            <p>
              We may update this policy from time to time. Material changes will be communicated
              via email or a notice in the app. Continued use of MailScope after changes constitutes
              acceptance of the updated policy.
            </p>
          </Section>

          <Section title="9. Contact">
            <p>
              For privacy questions or data deletion requests, email us at{" "}
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

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="font-medium mb-1" style={{ color: "var(--text-primary)" }}>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
