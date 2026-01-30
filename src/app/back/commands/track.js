export default async (ctx) => {
    const chatId = String(ctx.chat.id)
    const text = ctx.message.text.split(" ")
    let postId
    console.log(text)

    if (text.length < 2) {
        ctx.reply("Uso correcto: \n\n/track <Número del post>")
        return
    } else {
        postId = parseInt(text[1])

        if (isNaN(postId)) {
            ctx.reply("Post no válido. Uso correcto:\n\n/track <número del post>")
            return
        }
    }

    const response = await fetch(`${process.env.URL}/api/track`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            chatId: chatId,
            postId: postId
        })
    })
    let data = await response.json()
    const { error, message } = data
    if (response.status != 200) {
        console.log("Error en la API al hacer tracking: ", await response.text())
        
        return ctx.reply(error)
    }
    return ctx.reply(message)
}

