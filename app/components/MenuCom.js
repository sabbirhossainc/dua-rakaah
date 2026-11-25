
"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export default function MenuCom() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const data = [
    {
      item: "1",
      icon: "supportgr",
      alt: "Support",
      title: "Support Us",
      href: "",
    },
    {
      item: "2",
      icon: "download",
      alt: "Download",
      title: "Download Dua App",
      href: "",
    },
    {
      item: "3",
      icon: "privacy",
      alt: "Privacy",
      title: "Privacy Policy",
      href: "",
    },
    {
      item: "4",
      icon: "credit",
      alt: "Credits",
      title: "Thanks & Credits",
      href: "",
    },
    {
      item: "5",
      icon: "about",
      alt: "About",
      title: "About Us",
      href: "",
    },
    {
      item: "6",
      icon: "copyright",
      alt: "Copyright",
      title: "Copyright Warning",
      href: "",
    },
    {
      item: "7",
      icon: "projects",
      alt: "Projects",
      title: "Our Other Projects",
      href: "",
    },
  ];

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={menuRef} className="relative inline-block text-left">
      <button
        type="button"
        id="menu-button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls="dropdown"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex w-full items-center justify-center gap-x-2 bg-transparent px-3 py-2 text-sm font-semibold text-gray-900"
      >
        <Image
          src="/icons/profile1.svg"
          alt="Profile"
          className="dark:invert"
          width={40}
          height={40}
        />

        <Image
          src={
            open
              ? "/icons/caret-up-solid.svg"
              : "/icons/caret-down-solid.svg"
          }
          alt=""
          aria-hidden="true"
          className="dark:invert"
          width={10}
          height={10}
        />
      </button>

      {open && (
        <div
          id="dropdown"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="menu-button"
          className="absolute right-0 z-10 mt-2 w-60 origin-top-right rounded-2xl bg-white px-3 py-4 pt-6 shadow-lg ring-1 ring-black/5 focus:outline-hidden"
        >
          {data.map((menu) => (
            <div
              key={menu.item}
              role="none"
              className="flex w-full cursor-pointer items-center rounded-xl py-2 transition duration-150 ease-in-out hover:bg-gray-50"
            >
              <div className="flex items-center px-2">
                <Image
                  src={`/icons/${menu.icon}.svg`}
                  alt=""
                  aria-hidden="true"
                  className="dark:invert"
                  width={20}
                  height={20}
                />

                <a
                  href={menu.href || "#"}
                  role="menuitem"
                  id={`menu-item-${menu.item}`}
                  onClick={() => setOpen(false)}
                  className="ml-3 text-sm text-gray-900"
                >
                  {menu.title}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
