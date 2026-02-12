import { prisma } from "@/libs/prisma"


export async function replaceMenu(userStateId, messageId, data) {
  await prisma.menus.deleteMany({ where: { userStateId: userStateId } })

  return prisma.menus.create({
    data: {
      userStateId,
      messageId,
      ...data
    }
  })
}



export async function getMenu(userStateId) {
  return prisma.menus.findFirst({
    where: { userStateId }
  })
}

