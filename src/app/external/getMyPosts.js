import { deriveSecretKey, generateSalt } from '@/app/utils/utils';
import { prisma } from '@/libs/prisma';
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


export async function getMyPosts(user, pin) {

    const salt = await getSalt(user);
    const derivedKey = deriveSecretKey(pin, salt);

    const response = await fetch(`${process.env.WEB_URL}/api/bot/getposts`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.WEB_TOKEN}`,
        },
        body: JSON.stringify({
            secretKey: derivedKey
        })
    });

    if (response.status != 200) {
        console.log("Error al obtener los posts: ", await response.text())
        return { error: "Error al obtener los posts." }
    }
    const messages = await response.json()

    console.log("posts: ", messages)

    return { messages: messages }
}