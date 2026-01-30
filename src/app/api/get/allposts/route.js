import { NextResponse } from 'next/server';
import { prisma } from '@/libs/prisma';



export async function POST(req, res) {
    const request = await req.json();
    const { boardId } = request;

    if (!boardId) {
        console.log(request)
        return NextResponse.json({ error: "Faltan parámetros obligatorios." }, { status: 400 });
    }

    const response = await fetch(`${process.env.WEB_URL}/api/bot/scrape/posts`,{
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.WEB_TOKEN}`,
        },
        body: JSON.stringify({
            boardId: boardId
        })
    });

    if (response.status != 200) {
        console.log("Error al obtener los posts: ", await response.text())
        return NextResponse.json({ error: "Error al obtener los posts." }, { status: 500 });
    }
    const posts = await response.json()
    
    // console.log("posts: ", posts)

    return NextResponse.json(posts);
}