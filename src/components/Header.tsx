"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  const activeLabel =
    pathname === "/translator" ? "Translator" :
    pathname === "/summarize" ? "Summarize" :
    pathname === "/proofreader" ? "Proofreader" :
    pathname === "/writer" ? "Writer" :
    pathname === "/rewriter" ? "Rewriter" :
    "Prompt";

  const baseClasses =
    "inline-flex items-center justify-center px-4 py-2 rounded-[14px] font-medium font-sans text-black leading-none";

  return (
    <header className="flex items-center px-8 py-6 gap-6">
      <div className="flex items-center gap-3">
        <Image src="/Logo.svg" alt="Linguo logo" width={100} height={100} />
      </div>

      <ul className="flex-1 flex justify-center gap-2 text-[15px]">
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

      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 grid place-items-center text-white font-semibold">
        L
      </div>
    </header>
  );
}