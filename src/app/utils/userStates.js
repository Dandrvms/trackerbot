import { prisma } from "@/libs/prisma"

export async function updateUserState(userId, patch) {
    const state = await prisma.user_States.upsert({
        where: { userId },
        update: patch,
        create: {
            userId,
            ...patch
        }
    })

    return state
}


export async function getUserState(userId) {
    const userState = await prisma.user_States.findUnique({
        where: { userId }
    })

    return userState
}

