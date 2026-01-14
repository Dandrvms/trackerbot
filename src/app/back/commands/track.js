import { prisma } from "@/libs/prisma"
const url = process.env.BOARDS_URL
const scrapeURL = process.env.WEB_URL
const boards = ["webo", "meta", "polls"]

export default async (ctx) => {
    const chatId = String(ctx.chat.id)
    const text = ctx.message.text.split(" ")
    console.log(text)

    if (text.length < 2) {
        ctx.reply("Uso correcto: \n\n/track <Enlace del post>")
    } else {
        const link = text[1]
        if (link.includes(url)) {

            const base = link.split(url)[1].split("#")
            if (base.lenght < 2 || base == "") {
                ctx.reply("Enlace no válido.")

                return
            }
            const board = base[0]

            if (!boards.includes(board)) {
                ctx.reply("Tablón no válido.")

            }


            const post = parseInt(base[1])
            if (isNaN(post)) {
                ctx.reply("Post no válido.")
                return
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
                if (user.tracking.map(t => t.postId).includes(post)) {
                    ctx.reply(`Ya estabas siguiendo el post ${post}`)
                    return
                } else {
                    const get = await fetch(`${scrapeURL}/api/bot/scrape/posts/${post}`, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${process.env.WEB_TOKEN}`
                        }
                    })
                    if (get.status != 200) {
                        ctx.reply("No se pudo encontrar el post.")

                        return
                    }
                    const { content } = await get.json()
                    const res = await prisma.trackings.create({
                        data: {
                            userId: user.id,
                            postId: post,
                            content
                        }
                    })
                    if (res) {
                        ctx.reply(`Ahora estás siguiendo el post ${post}`)
                    } else {
                        ctx.reply("No se pudo seguir el post.")
                    }
                }
            } else {
                const res = await prisma.users.create({
                    data: {
                        chat_id: chatId
                    },
                    tracking: {
                        create: {
                            postId: post,
                            content
                        }
                    }

                })

                if (res) {
                    ctx.reply(`Ahora estás siguiendo el post ${post}`)
                } else {
                    ctx.reply("No se pudo seguir el post.")
                }
            }


        } else {
            ctx.reply("Lo siento, no puedo seguir los posts de esa página.")
        }
    }
    // const user = await prisma.users.findFirst({
    //     where: {
    //         chat_id: chatId
    //     },
    //     include: {
    //         tracking: true
    //     }
    // })

    // if (user) {
    //     const trackings = user.tracking.map(t => t.name)
    //     if (trackings.length > 0) {
    //         ctx.reply("Estás siguiendo los siguientes elementos:\n- " + trackings.join("\n- "))
    //     } else {
    //         ctx.reply("No estás siguiendo ningún elemento.")
    //     }
    // }
}

