import Image from "next/image";

export default function Home() {
  return (
    <main>
      <h1>Welcome to the Tracker Bot</h1>
      <p>Go to <a href="https://t.me/webochanbot" className="text-blue-600 hover:text-white active:text-white">@webochanbot</a> to get started.</p>
      {/* <Image src="/images/telegram-bot.png" alt="Telegram Bot" width={500} height={300} /> */}
    </main>
  );
}
