import { NextRequest, NextResponse } from "next/server";
import { isAppAdmin } from "@/lib/admin";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const email = searchParams.get("email");
    
    if (!email) {
      return NextResponse.json({ isAdmin: false }, { status: 400 });
    }
    
    const admin = await isAppAdmin(email);
    return NextResponse.json({ isAdmin: admin });
  } catch (error) {
    console.error("Admin check error:", error);
    return NextResponse.json({ isAdmin: false }, { status: 500 });
  }
}

