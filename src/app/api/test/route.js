//api test
import { NextResponse } from "next/server";
import {bot} from "@/app/back/bot";
export async function POST(req, res) {
    const request = await req.json();
    console.log(request)
    return NextResponse.json({success: true})
}