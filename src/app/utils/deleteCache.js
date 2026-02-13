import { prisma } from "@/libs/prisma"

export async function deleteCache(userId, userStateId) { 
    await prisma.user_States.deleteMany({
        where: {
            id: userStateId
        }
    })

    await prisma.userSession.deleteMany({
        where: {
            userId: userId
        }
    })
}