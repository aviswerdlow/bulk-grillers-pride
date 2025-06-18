import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // For logout, we'll return a redirect URL to Clerk's sign out
    const redirectUrl = `${process.env.NEXT_PUBLIC_CLERK_SIGN_OUT_URL || '/sign-in'}`;

    // Return success response with redirect URL
    return NextResponse.json({ 
      success: true,
      redirectUrl 
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to logout" }, 
      { status: 500 }
    );
  }
} 