import { NextResponse } from 'next/server';



export async function getAllPosts(boardId) {
    
    const response = await fetch(`${process.env.WEB_URL}/api/bot/scrape/board/${boardId}`,{
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.WEB_TOKEN}`,
        }
    });

    if (response.status != 200) {
        console.log("Error al obtener los posts: ", await response.text())
        return { error: "Error al obtener los posts." }
    }
    const posts = await response.json()
    
    // console.log("posts: ", posts)

    return posts
}