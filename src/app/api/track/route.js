import { NextResponse } from "next/server"
import { prisma } from "@/libs/prisma"
export async function POST(req) {
    const scrapeURL = process.env.WEB_URL
    const request = await req.json()
    const { chatId, postId } = request

    if (!chatId || !postId) {
        console.log(request)
        return NextResponse.json({ error: "Faltan parámetros obligatorios." }, { status: 400 });
    }

    const user = await prisma.users.findFirst({
        where: {
            chat_id: chatId
        },
        include: {
            tracking: true
        }
    })

    if (user) {
        if (user.tracking.map(t => t.postId).includes(postId)) {
            return NextResponse.json({ message: `Ya estabas siguiendo el post ${postId}` })
        } else {
            try {
                const get = await fetch(`${scrapeURL}/api/bot/scrape/posts/${postId}`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${process.env.WEB_TOKEN}`
                    }
                })
                if (get.status == 404) {
                    return NextResponse.json({ error: "No se pudo encontrar el post." })

                }
                if (get.status != 200) {
                    return NextResponse.json({ error: "Ocurrió un error. Intenta de nuevo." })
                }

                const { content } = await get.json()
                const res = await prisma.trackings.create({
                    data: {
                        userId: user.id,
                        postId: Number(postId),
                        content: content.slice(0, 100)
                    }
                })
                if (res) {
                    return NextResponse.json({ message: `Ahora estás siguiendo el post ${postId}` })
                } else {
                    return NextResponse.json({ message: "No se pudo seguir el post." })
                }
            } catch(e){
                console.log(e)
            }
        }
    } else {
        const res = await prisma.users.create({
            data: {
                chat_id: chatId
            },
            tracking: {
                create: {
                    postId: postId,
                    content
                }
            }

        })

        if (res) {
            return NextResponse.json({ message: `Ahora estás siguiendo el post ${postId}` })
        } else {
            return NextResponse.json({ message: "No se pudo seguir el post." })
        }
    }


}