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

    if (user) {
        const boards = user.board.map(b => b.name)
        if (boards.length > 0) {
            ctx.reply("Estás suscrito a los siguientes tablones:\n- " + boards.join("\n- "))
        } else {
            ctx.reply("No estás suscrito a ningún tablón.")
        }

        const trackingsId = user.tracking.map(t => t.postId)
        const trackingsContent = user.tracking.map(t => t.content)
        if (trackingsId.length > 0) {
            const elements = trackingsId.map((id, index) => `${id}. ${trackingsContent[index]}`).join("\n")

            ctx.reply("Estás siguiendo los siguientes posts:\n" + elements)
        } else {
            ctx.reply("No estás siguiendo ningún post.")
        }
    }
}