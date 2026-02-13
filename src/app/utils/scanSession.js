import { prisma } from "@/libs/prisma";

export async function createScanSession(userStateId, ttlMinutes = 10) {
    await prisma.scanSession.deleteMany({
        where: {
            userStateId,
            expiresAt: { lt: new Date() }
        }
    });

    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    const session = await prisma.scanSession.create({
        data: {
            userStateId,
            expiresAt
        }
    });

    return session


}

export async function storeScanData(sessionId, posts) {
    // 1. Guardar posts
    await prisma.scanPost.createMany({
        data: posts.map(p => ({
            sessionId,
            externalId: p.id.toString(),
            boardId: p.boardId,
            preview: p.content
        }))
    });

    // 2. Obtener posts creados (para mapear IDs reales)
    const dbPosts = await prisma.scanPost.findMany({
        where: { sessionId }
    });

    const postMap = new Map(
        dbPosts.map(p => [p.externalId, p.id])
    );

    // 3. Preparar comentarios
    const commentsData = [];

    for (const p of posts) {
        const postId = postMap.get(p.id.toString());
        if (!postId) continue;

        for (const c of p.comments ?? []) {
            commentsData.push({
                postId,
                externalId: c.id.toString(),
                preview: c.content
            });
        }
    }

    // 4. Guardar comentarios
    if (commentsData.length) {
        await prisma.scanComment.createMany({
            data: commentsData
        });
    }
}


export async function getActiveScanSession(userId) {
    const state = await prisma.user_States.findUnique({
        where: { userId },
        include: {
            scanSession: {
                where: { expiresAt: { gt: new Date() } },
                include: {
                    scanPosts: {
                        include: {
                            comments: true
                        }
                    }
                }
            }
        }
    });

    return state?.scanSession ?? null;
}

export async function getScanPosts(sessionId, boardId) {
    return prisma.scanPost.findMany({
        where: { sessionId, boardId },
        orderBy: { id: "asc" }
    });
}


export async function getScanPostDetail(sessionId, postId) {
    return prisma.scanPost.findFirst({
        where: {
            externalId: String(postId),
            sessionId: sessionId
        },
        include: {
            comments: true
        }
    });
}

