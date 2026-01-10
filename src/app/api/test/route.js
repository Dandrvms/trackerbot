//api test
import { NextResponse } from "next/server";

export async function POST(req, res) {
    const request = await req.json();
    console.log(request)
    return NextResponse.json({success: true})
}