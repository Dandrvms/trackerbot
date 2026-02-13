//enviar post a un tablón

import { prisma } from "@/libs/prisma"
import { generateSalt, deriveSecretKey } from "@/app/utils/utils";
import { makePreview } from "../utils/managePosts";

async function getSalt(user) {
    const salt = await prisma.users.findFirst({
        where: { chat_id: user },
        select: { salt: true }
    });

    if (!salt) {
        const newSalt = generateSalt();
        await prisma.users.update({
            where: { chat_id: user.toString() },
            data: { salt: newSalt }
        });
        return newSalt
    }
    return salt.salt;
}

export async function post(content, boardId, pin, user, userStateId, scanSessionId) {


    const salt = await getSalt(user);
    const derivedKey = deriveSecretKey(pin, salt);


    const response = await fetch(`${process.env.WEB_URL}/api/bot/post`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.WEB_TOKEN}`,
            'Origin': process.env.URL
        },
        body: JSON.stringify({
            content: content,
            board: boardId,
            derivedKey: derivedKey,
        })
    })

    const data = await response.json();

    if (response.status != 200) {
        return { error: "Error al enviar el post." }
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    // if (scanSessionId) {
    //     await prisma.scanPost.create({
    //         data: {
    //             sessionId: scanSessionId,
    //             externalId: String(data.id),
    //             boardId: boardId,
    //             preview: data.content
    //         }
    //     })
    // }



    return { cont: data.content, id: data.id };
}