import { prisma } from "@/libs/prisma"

export async function getMyPostsForState(userStateId) {
    return prisma.managePosts.findMany({
        where: {
            userStateId,
            expiresAt: { gt: new Date() }
        },
        orderBy: { id: 'asc' }
    })
}

export async function getUniquePost(postId) {
    const post = await prisma.managePosts.findFirst({
        where: {
            externalId: postId
        }
    })
    console.log(post)
    return post
}

export async function setMyPostsForState(userStateId, messages, ttlMinutes = 10) {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000)

    await prisma.managePosts.deleteMany({
        where: { userStateId }
    })

    await prisma.managePosts.createMany({
        data: messages.map(msg => ({
            externalId: msg.id.toString(),
            preview: msg.content,
            userStateId,
            boardId: msg.boardId,
            expiresAt
        })),
        skipDuplicates: true
    })
}

export function makePreview(content, length = 30) {
    return content.length > length
        ? content.slice(0, length) + '...'
        : content
}
