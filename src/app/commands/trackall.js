import { prisma } from "@/libs/prisma"

export default async (ctx) => {
    const userId = String(ctx.from.id)
    const user = await prisma.users.findFirst({
        where: {
            chat_id: userId.toString()
        },
        select: {
            trackall: true,
        }
    })

    if (user) {
        if (user.trackall) ctx.reply("Ya estabas siguiendo todas las respuestas de posts en tus tablones seguidos")
        else {
            await prisma.users.update({
                where: {
                    chat_id: userId.toString()
                },
                data: {
                    trackall: true
                }
            })

            ctx.reply("Ahora te llegarán todos los comentarios en tablones que sigas.")
        }

    } else {
        await prisma.users.create({
            data: {
                chat_id: userId.toString(),
                trackall: true
            }
        })
    }

}