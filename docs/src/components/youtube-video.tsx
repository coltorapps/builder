import Image from "next/image";
import youtubeThumbnail from "@/images/youtube-thumbnail.png";

export function YoutubeVideo() {
  return (
    <div className="group relative">
      <a href="https://www.youtube.com/watch?v=n6kTcHkjj_8" target="_blank">
        <Image
          className="rounded-xl"
          src={youtubeThumbnail}
          alt=""
          unoptimized
          priority
          width={0}
          height={0}
          sizes="100vw"
          style={{ width: "100%", height: "auto" }}
        />
        <div className="absolute inset-0 z-10 flex h-full w-full items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-16 w-16 text-white opacity-60 transition-all duration-300 group-hover:scale-110 group-hover:opacity-100"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.91 11.672a.375.375 0 0 1 0 .656l-5.603 3.113a.375.375 0 0 1-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112Z"
            />
          </svg>
        </div>
      </a>
    </div>
  );
}
