
import Image from "next/image";
import { Suspense } from "react";
import LanguageToggle, { LanguageButtons } from "@/app/components/LanguageToggle";
export default function RightBar() {
  return (
    
      <div id="right-bar" className="overflow-hidden w-full 2xl:w-[270px]">
        <div className="bg-white w-full h-[76vh] lg:h-[calc(86vh)] xl:h-[92vh] 2xl:h-[86vh] rounded-3xl overscroll-y-contain scroll-smooth scroll-my-2 overflow-y-scroll scrollbar-width-thin pb-16 2xl:w-full">
          <div className="mt-8 pb-6">
            <p className="text-center text-2xl">
              Settings
            </p>
          </div>
          <div className="sm:pb-4 w-full">
            <div className="mx-4 my-4">
              <div className="border-x-devider border-x border-b border-solid border divide-[#cccdcf] rounded-lg">
                <div className="">
                  <div className="transition duration-300 delay-10 bg-dua-bg flex flex-row w-full rounded-lg">
                    <div className="bg-primary w-1 rounded-tl-lg rounded-bl-lg"></div>
                    <div className="p-2 flex flex-row items-center w-full cursor-pointer">
                      <div className="bg-icon-bg flex p-2 items-center rounded-full mr-5 justify-center">
                        <Image
                          src="/icons/language.svg"
                          alt="language"
                          className="dark:invert"
                          width={24}
                          height={24}
                        />
                      </div>
                      <p className="text-primary font-medium text-start text-base leading-5 style-Kalpurush">
                        Language Settings
                      </p>
                    </div>
                  </div>
                </div>
                <div className="">
                  <div className="py-6 rounded-b-lg">
                    {/* useSearchParams in the toggle needs a boundary on prerendered pages */}
                    <Suspense fallback={<LanguageButtons active="en" />}>
                      <LanguageToggle />
                    </Suspense>
                  </div>
                </div>
              </div>
            </div>
            <div className="mx-4 my-4">
              <div className="">
                <div className="cursor-pointer">
                  <div className="bg-dua-bg flex flex-row w-full rounded-lg">
                    <div className=" w-1 rounded-tl-lg rounded-bl-lg"></div>
                    <div className="p-2 flex flex-row items-center w-full">
                      <div className="bg-icon-bg flex p-2 items-center rounded-full mr-5 justify-center">
                        <Image
                          src="/icons/general.svg"
                          alt="general"
                          className="dark:invert"
                          width={24}
                          height={24}
                        />
                      </div>
                      <p className="text-start text-base leading-5 style-Kalpurush">
                        General Settings
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mx-4 my-4">
              <div className="">
                <div className="cursor-pointer">
                  <div className="bg-dua-bg flex flex-row w-full rounded-lg">
                    <div className=" w-1 rounded-tl-lg rounded-bl-lg"></div>
                    <div className="p-2 flex flex-row items-center w-full">
                      <div className="bg-icon-bg flex p-2 items-center rounded-full mr-5 justify-center">
                        <Image
                          src="/icons/font.svg"
                          alt="font"
                          className="dark:invert"
                          width={24}
                          height={24}
                        />
                      </div>
                      <p className="text-start text-base leading-5 style-Kalpurush">
                      Font Settings
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mx-4 my-4">
              <div className="">
                <div className="cursor-pointer">
                  <div className="bg-dua-bg flex flex-row w-full rounded-lg">
                    <div className="w-1 rounded-tl-lg rounded-bl-lg"></div>
                    <div className="p-2 flex flex-row items-center w-full">
                      <div className="bg-icon-bg flex p-2 items-center rounded-full mr-5 justify-center">
                        <Image
                          src="/icons/font.svg"
                          alt="font"
                          className="dark:invert"
                          width={24}
                          height={24}
                        />
                      </div>
                      <p className="text-start text-base leading-5 style-Kalpurush">
                      Appearance Settings
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
