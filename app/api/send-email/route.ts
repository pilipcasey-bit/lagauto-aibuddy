import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY not configured" },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  let body: { to?: string; subject?: string; html?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  if (!body.to || !body.subject || !body.html) {
    return NextResponse.json(
      { error: "Missing required fields: to, subject, html" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "LAG Auto <lagauto@murdawkmedia.com>",
        to: body.to,
        subject: body.subject,
        html: body.html,
      }),
    });

    const data = await response.json() as { id?: string; message?: string; name?: string };

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || data.name || "Resend error" },
        { status: response.status, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, id: data.id },
      { headers: CORS_HEADERS }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
