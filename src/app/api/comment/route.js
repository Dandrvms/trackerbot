//enviar post a un tablón

import { prisma } from "@/libs/prisma"
import {bot} from "@/app/back/bot"
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

export async function POST(req, res) {
    

    const request = await req.json();
    const { postId, content, pin, user} = request;
    
    if (!postId || !content || !pin || !user) {
        console.log(request)
        return NextResponse.json({ error: "Faltan parámetros obligatorios." }, { status: 400 });
    }

    
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
        return NextResponse.json({ error: "Error al enviar el post." }, { status: 500 });
    }



    return NextResponse.json({ cont: data.content, id: data.id });
}