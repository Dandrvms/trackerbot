import { prisma } from "@/libs/prisma"

export default async (ctx) => {
    const userId = String(ctx.from.id)
    const user = await prisma.users.findUnique({
        where: {
            chat_id: userId.toString()
        },
        select: {
            trackall: true,
        }
    })

    if (user) {
        if (!user.trackall) ctx.reply("No estabas siguiendo todos los comentarios.")
        else {
            await prisma.users.update({
                where: {
                    chat_id: userId.toString()
                },
                data: {
                    trackall: false
                }
            })

            ctx.reply("Ya no te llegarán todos los comentarios en tablones que sigas.")
        }

    } else {
        await prisma.users.create({
            data: {
                userId: userId.toString(),
                trackall: false
            }
        })
    }

}