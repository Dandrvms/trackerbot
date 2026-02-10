import { prisma } from "@/libs/prisma"

export default async (ctx) => {
    const chatId = String(ctx.chat.id)

    const user = await prisma.users.findFirst({
        where: {
            chat_id: chatId
        },
        include: {
            board: true,
            tracking: true
        }
    })
    let message = ""
    if (user) {
        const boards = user.board.map(b => b.name)
        if (boards.length > 0) {
            message += "*Estás suscrito a los siguientes tablones:*\n- " + boards.join("\n- ")
        } else {
            message += "*No estás suscrito a ningún tablón.*"
        }

        const trackingsId = user.tracking.map(t => t.postId)
        const trackingsContent = user.tracking.map(t => t.content)
        if (trackingsId.length > 0) {
            const elements = trackingsId.map((id, index) => `_${id}. ${trackingsContent[index]}_`).join("\n\n")

            message += "\n\n*Y estás siguiendo los siguientes posts:*\n\n" + elements
        } else {
            message += "\n\n*No estás siguiendo ningún post.*"
        }

        ctx.reply(message, {parse_mode: 'Markdown'})
    } else {
        ctx.reply("No tienes registros.")
    }
}