import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function GET(request: Request) {
  await clearSessionCookie();
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete("fms_session");
  return response;
}
