
import { prisma } from "@/libs/prisma"
export async function track(chatId, postId) {
    const scrapeURL = process.env.WEB_URL


    // if (!chatId || !postId) {
    //     console.log(request)
    //     return NextResponse.json({ error: "Faltan parámetros obligatorios." }, { status: 400 });
    // }

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
            return { message: `Ya estabas siguiendo el post ${postId}` }
        } else {
            try {
                const get = await fetch(`${scrapeURL}/api/bot/scrape/post/${postId}`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${process.env.WEB_TOKEN}`
                    }
                })
                if (get.status == 404) {
                    return { error: "No se pudo encontrar el post." }

                }
                if (get.status != 200) {
                    return { error: "Ocurrió un error. Intenta de nuevo." }
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
                    return { message: `Ahora estás siguiendo el post ${postId}` }
                } else {
                    return { message: "No se pudo seguir el post." }
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
            return { message: `Ahora estás siguiendo el post ${postId}` }
        } else {
            return { message: "No se pudo seguir el post." }
        }
    }


}