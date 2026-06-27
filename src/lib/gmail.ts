import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

export type GmailMessage = {
  gmailId: string;
  threadId: string;
  subject: string;
  fromAddress: string;
  fromName: string | null;
  snippet: string;
  bodyPreview: string;
  receivedAt: Date;
};

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf-8");
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|tr|li|h[1-6]|blockquote|section|article)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractBody(payload: {
  mimeType?: string | null;
  body?: { data?: string | null } | null;
  parts?: Array<{
    mimeType?: string | null;
    body?: { data?: string | null } | null;
    parts?: unknown[];
  }> | null;
}): string {
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractBody(part as typeof payload);
      if (text) return text;
    }
  }

  if (payload.mimeType === "text/html" && payload.body?.data) {
    return stripHtml(decodeBase64Url(payload.body.data));
  }

  return "";
}

function parseFromHeader(from: string): { address: string; name: string | null } {
  const match = from.match(/^(?:"?([^"]*)"?\s)?<?([^>]+@[^>]+)>?$/);
  if (!match) return { address: from, name: null };
  return { address: match[2].trim(), name: match[1]?.trim() || null };
}

async function getOAuthClient(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });

  if (!account?.access_token) {
    throw new Error("Gmail account not connected");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token ?? undefined,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  oauth2Client.on("tokens", async (tokens) => {
    await prisma.account.update({
      where: {
        provider_providerAccountId: {
          provider: "google",
          providerAccountId: account.providerAccountId,
        },
      },
      data: {
        access_token: tokens.access_token ?? account.access_token,
        refresh_token: tokens.refresh_token ?? account.refresh_token,
        expires_at: tokens.expiry_date
          ? Math.floor(tokens.expiry_date / 1000)
          : account.expires_at,
      },
    });
  });

  return oauth2Client;
}

export async function fetchInboxMessages(
  userId: string,
  syncDays: number,
): Promise<GmailMessage[]> {
  const auth = await getOAuthClient(userId);
  const gmail = google.gmail({ version: "v1", auth });

  const afterDate = new Date();
  afterDate.setDate(afterDate.getDate() - syncDays);
  const afterQuery = `${afterDate.getFullYear()}/${String(afterDate.getMonth() + 1).padStart(2, "0")}/${String(afterDate.getDate()).padStart(2, "0")}`;

  const messages: GmailMessage[] = [];
  let pageToken: string | undefined;

  do {
    const listResponse = await gmail.users.messages.list({
      userId: "me",
      q: `in:inbox after:${afterQuery}`,
      maxResults: 100,
      pageToken,
    });

    const messageIds = listResponse.data.messages ?? [];

    for (const item of messageIds) {
      if (!item.id) continue;

      const full = await gmail.users.messages.get({
        userId: "me",
        id: item.id,
        format: "full",
      });

      const headers = full.data.payload?.headers ?? [];
      const subject =
        headers.find((h) => h.name?.toLowerCase() === "subject")?.value ?? "(no subject)";
      const from =
        headers.find((h) => h.name?.toLowerCase() === "from")?.value ?? "unknown";
      const dateHeader =
        headers.find((h) => h.name?.toLowerCase() === "date")?.value ?? null;

      const { address, name } = parseFromHeader(from);
      const body = extractBody(full.data.payload ?? {});
      const receivedAt = dateHeader ? new Date(dateHeader) : new Date();

      messages.push({
        gmailId: item.id,
        threadId: full.data.threadId ?? item.id,
        subject,
        fromAddress: address,
        fromName: name,
        snippet: full.data.snippet ?? "",
        bodyPreview: body.slice(0, 2000),
        receivedAt,
      });
    }

    pageToken = listResponse.data.nextPageToken ?? undefined;
  } while (pageToken);

  return messages;
}
