"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const tabs = [
  { label: "Prompt", href: "/" },
  { label: "Proofreader", href: "/proofreader" },
  { label: "Summarize", href: "/summarize" },
  { label: "Translator", href: "/translator" },
  { label: "Writer", href: "/writer" },
  { label: "Rewriter", href: "/rewriter" },
];

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const activeLabel =
    pathname === "/translator" ? "Translator" :
    pathname === "/summarize" ? "Summarize" :
    pathname === "/proofreader" ? "Proofreader" :
    pathname === "/writer" ? "Writer" :
    pathname === "/rewriter" ? "Rewriter" :
    "Prompt";

  const baseClasses =
    "inline-flex items-center justify-center px-3 sm:px-4 py-2 rounded-[14px] font-medium font-sans text-black leading-none";

  return (
    <div className="px-4 sm:px-6 md:px-8">
      <header className="flex items-center gap-4 sm:gap-6 py-4 sm:py-6">
        <div className="flex items-center gap-3">
          <Image
            src="/Logo.svg"
            alt="Linguo logo"
            width={100}
            height={100}
            className="w-10 h-10 sm:w-14 sm:h-14"
            priority
          />
        </div>

        {/* Desktop navigation */}
        <ul className="hidden md:flex flex-1 justify-center gap-2 text-[13px] sm:text-[15px]">
          {tabs.map(({ label, href }) => (
            <li key={label} className="flex">
              {href ? (
                <Link
                  href={href}
                  aria-current={activeLabel === label ? "page" : undefined}
                  className={`${baseClasses} hover:cursor-pointer ${
                    activeLabel === label ? "bg-[#C0FFBE]" : ""
                  }`}
                >
                  {label}
                </Link>
              ) : (
                <button
                  className={`${baseClasses} cursor-default ${
                    activeLabel === label ? "bg-[#C0FFBE]" : ""
                  }`}
                  disabled
                >
                  {label}
                </button>
              )}
            </li>
          ))}
        </ul>

        {/* Right avatar / brand mark */}
        <div className="hidden sm:grid h-9 w-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 place-items-center text-white font-semibold">
          L
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          className="md:hidden ml-auto inline-flex items-center gap-2 rounded-[14px] border border-black/10 px-3 py-2 text-sm"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
      </header>

      {/* Mobile navigation panel */}
      <nav
        id="mobile-nav"
        aria-hidden={!menuOpen}
        className={`${menuOpen ? "block" : "hidden"} md:hidden pb-4`}
      >
        <ul className="flex flex-col gap-2">
          {tabs.map(({ label, href }) => (
            <li key={label} className="flex">
              {href ? (
                <Link
                  href={href}
                  aria-current={activeLabel === label ? "page" : undefined}
                  className={`${baseClasses} hover:cursor-pointer w-full text-center ${
                    activeLabel === label ? "bg-[#C0FFBE]" : "bg-white"
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  {label}
                </Link>
              ) : (
                <button
                  className={`${baseClasses} cursor-default w-full text-center ${
                    activeLabel === label ? "bg-[#C0FFBE]" : "bg-white"
                  }`}
                  disabled
                  onClick={() => setMenuOpen(false)}
                >
                  {label}
                </button>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}