import { prisma } from "@/libs/prisma"

export default async (ctx) =>{
    const chatId = String(ctx.chat.id)

    const text = ctx.message.text.split(" ")
    if (text.length < 2) {
        ctx.reply("Uso correcto: \n\n/untrack <número del post>")
        return
    }

    const postId = parseInt(text[1])
    if (isNaN(postId)) {
        ctx.reply("Por favor, proporciona un número de post válido.")
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

    if (!user) {
        ctx.reply("No estás siguiendo ningún post.")
        return
    }

    const tracking = user.tracking.find(t => t.postId === postId)
    if (!tracking) {
        ctx.reply("No estás siguiendo el post " + postId)
        return
    }

    await prisma.trackings.delete({
        where: {
            id: tracking.id
        }
    })

    ctx.reply("Has dejado de seguir el post " + postId)
}
      
