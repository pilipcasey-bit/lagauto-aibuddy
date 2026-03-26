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

function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return "+1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  return "+" + digits;
}

export async function POST(req: NextRequest) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return NextResponse.json(
      { error: "Twilio credentials not configured" },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  let body: { to?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  if (!body.to || !body.message) {
    return NextResponse.json(
      { error: "Missing required fields: to, message" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const to = toE164(body.to);

  // Hard truncation safety net: Twilio trial prepends ~38 chars, so cap at 140
  let smsBody = body.message;
  if (smsBody.length > 140) {
    smsBody = smsBody.slice(0, 137) + "...";
  }

  try {
    const params = new URLSearchParams({
      To: to,
      From: fromNumber,
      Body: smsBody,
    });

    const credentials = btoa(`${accountSid}:${authToken}`);
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    const data = await response.json() as { sid?: string; message?: string; error_message?: string };

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || data.error_message || "Twilio error" },
        { status: response.status, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, sid: data.sid },
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
