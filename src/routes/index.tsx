import { createFileRoute, Link } from "@tanstack/react-router";

import artisanImg from "@/assets/artisan-welcome.jpg";
import { CraftBackdrop } from "@/components/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kalaa Setu — Your craft. Your market. Your voice." },
      {
        name: "description",
        content: "Sell your handmade products with the help of AI. Just speak, and the assistant does the rest.",
      },
      { property: "og:title", content: "Kalaa Setu — Your craft. Your market. Your voice." },
      {
        property: "og:description",
        content: "Sell your handmade products with the help of AI. Just speak, and the assistant does the rest.",
      },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  return (
    <div className="min-h-screen">
      <CraftBackdrop />
      <div className="relative mx-auto flex min-h-screen max-w-[44rem] flex-col justify-center px-5 py-12 md:max-w-5xl">
        <div className="md:grid md:grid-cols-2 md:items-center md:gap-12">
          <div className="glass overflow-hidden">
            <img
              src={artisanImg}
              alt="An artisan speaking to her phone beside her handloom"
              width={1024}
              height={1024}
              className="w-full object-cover"
            />
          </div>

          <div className="mt-8 md:mt-0">
            <h1 className="text-4xl leading-tight text-balance md:text-5xl">Your craft. Your market. Your voice.</h1>
            <p className="mt-4 text-lg text-ink/65">Sell your handmade products with the help of AI.</p>

            <div className="mt-8 space-y-3">
              <Link
                to="/language"
                className="flex min-h-16 items-center justify-center rounded-2xl bg-clay text-lg font-semibold text-white"
              >
                Start
              </Link>
              <Link to="/home" className="chip flex min-h-16 items-center justify-center text-base font-medium text-ink">
                I already have an account
              </Link>
            </div>
            <p className="mt-6 text-sm text-ink/50">Demo mode with sample products, buyers and sales.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
