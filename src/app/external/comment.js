//enviar post a un tablón

import { prisma } from "@/libs/prisma"
import {bot} from "@/app/bot"
import { generateSalt, deriveSecretKey } from "@/app/utils/utils";
import { NextResponse } from "next/server";

async function getSalt(user){
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

export async function comment(postId, content, pin, user) {

    
    const salt = await getSalt(user);
    const derivedKey = deriveSecretKey(pin, salt);

    console.log(`Usuario ${user} con PIN ${pin}`);
    console.log(`Enviando respuesta al post ${postId}: ${content}`);    

    const response = await fetch(`${process.env.WEB_URL}/api/bot/comment`,{
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.WEB_TOKEN}`,
            'Origin': process.env.URL
        },
        body: JSON.stringify({
            content: content,
            postId: postId,
            derivedKey: derivedKey,
        })
    })
    
    const data = await response.json();

    if (response.status != 200) {
        console.log("Error al enviar el post: ", await response.text())
        return { error: "Error al enviar el post." }
    }



    return { cont: data.content, id: data.id }
}