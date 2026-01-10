//notificar de un post en un tablón

import { prisma } from "@/libs/prisma"
import { NextResponse } from "next/server";
import bot from "@/app/back/bot";
export async function POST(req, res) {
    const request = await req.json();
    console.log(request)
    return NextResponse.json({success: true})
    // const request = await req.json();
    // const { content } = request;

    // if (!content) {
    //     console.log(request)
    //     return NextResponse.json({ error: "Faltan parámetros obligatorios." }, { status: 400 });
    // }

    
    // return NextResponse.json({ success: true });
}