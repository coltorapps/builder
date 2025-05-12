import { Fragment } from "react";
import Image from "next/image";
import Link from "next/link";
import blurCyanImage from "@/images/blur-cyan.png";
import blurIndigoImage from "@/images/blur-indigo.png";
import cubeImage from "@/images/cube.png";
import clsx from "clsx";
import { Highlight } from "prism-react-renderer";

import { Button } from "./ui/button";
import { WordRotate } from "./word-rotate";

const codeLanguage = "typescript";
const code = `export const formBuilder = createBuilder({
  entities: [
    createEntity({
      name: "textField",
      validate: (value) => z.string().parse(value),
    }),
  ],
});`;

function TrafficLightsIcon(props: React.ComponentPropsWithoutRef<"svg">) {
  return (
    <svg aria-hidden="true" viewBox="0 0 42 10" fill="none" {...props}>
      <circle cx="5" cy="5" r="4.5" />
      <circle cx="21" cy="5" r="4.5" />
      <circle cx="37" cy="5" r="4.5" />
    </svg>
  );
}

export function Hero() {
  return (
    <div className="overflow-hidden bg-neutral-950 dark:-mb-32 dark:mt-[-4.75rem] dark:pb-32 dark:pt-24">
      <div className="py-16 sm:px-2 lg:relative lg:px-0 lg:py-20">
        <div className="lg:max-w-8xl xl:gap-x-18 mx-auto grid max-w-2xl grid-cols-1 items-center gap-x-8 gap-y-40 px-4 md:max-w-3xl lg:grid-cols-2 lg:px-8 xl:px-12">
          <div className="relative z-10 md:text-center lg:text-left">
            <Image
              className="pointer-events-none absolute bottom-full right-full -mb-56 -mr-72 opacity-50"
              src={blurCyanImage}
              alt=""
              width={530}
              height={530}
              unoptimized
              priority
            />
            <div className="relative xl:pr-24">
              <h1 className="font-display inline bg-gradient-to-t from-slate-400 to-white bg-clip-text text-3xl tracking-tight text-transparent md:text-4xl">
                React Form Builder
              </h1>
              <h2 className="mt-3 tracking-tight text-neutral-400 md:text-2xl">
                <span className="not-sr-only">
                  Develop your dynamic{" "}
                  <WordRotate
                    words={["forms", "websites", "dashboards", "UIs"]}
                    className="rounded-2xl bg-gradient-to-t from-neutral-800 to-neutral-700 px-2 font-medium text-white"
                  />{" "}
                  builder.
                </span>
                <span className="sr-only">
                  Develop your own dynamic forms builder, websites builder,
                  dashboards builder. Dynamic UI form JSON. Drag and drop react
                  builder. Generate UI from JSON schema.
                </span>
              </h2>
              <div className="mt-8 flex gap-4 md:justify-center lg:justify-start">
                <Button asChild>
                  <Link href="/docs/installation">Get started</Link>
                </Button>
                <Button variant="secondary" asChild>
                  <Link
                    href="https://www.youtube.com/watch?v=n6kTcHkjj_8"
                    target="_blank"
                  >
                    Watch Intro
                    <svg
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="ml-1 h-6 w-6"
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
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 top-10 flex items-center justify-center xl:pl-10">
              <Image
                className="pointer-events-none h-auto w-[31rem] object-cover"
                src={cubeImage}
                alt=""
                unoptimized
                priority
              />
            </div>
            <div className="relative xl:pl-10">
              <div className="relative">
                <Image
                  className="pointer-events-none absolute -right-64 -top-64"
                  src={blurCyanImage}
                  alt=""
                  width={530}
                  height={530}
                  unoptimized
                  priority
                />
                <Image
                  className="pointer-events-none absolute -bottom-40 -right-44"
                  src={blurIndigoImage}
                  alt=""
                  width={567}
                  height={567}
                  unoptimized
                  priority
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-slate-300 via-slate-300/70 to-neutral-300 opacity-10 blur-lg" />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-slate-300 via-slate-300/70 to-neutral-300 opacity-10" />
                <div className="relative rounded-2xl bg-black/80 ring-1 ring-white/10 backdrop-blur-xl">
                  <div className="absolute -top-px left-20 right-11 h-px bg-gradient-to-r from-slate-300/0 via-slate-300/70 to-slate-300/0" />
                  <div className="absolute -bottom-px left-11 right-20 h-px bg-gradient-to-r from-neutral-400/0 via-neutral-400 to-neutral-400/0" />
                  <div className="pl-4 pt-4">
                    <TrafficLightsIcon className="h-2.5 w-auto stroke-neutral-500/60" />
                    <div className="mt-6 flex items-start px-1 text-sm">
                      <div
                        aria-hidden="true"
                        className="select-none border-r border-neutral-300/5 pr-4 font-mono text-neutral-600"
                      >
                        {Array.from({
                          length: code.split("\n").length,
                        }).map((_, index) => (
                          <Fragment key={index}>
                            {(index + 1).toString().padStart(2, "0")}
                            <br />
                          </Fragment>
                        ))}
                      </div>
                      <Highlight
                        code={code}
                        language={codeLanguage}
                        theme={{ styles: [], plain: {} }}
                      >
                        {({
                          className,
                          style,
                          tokens,
                          getLineProps,
                          getTokenProps,
                        }) => (
                          <pre
                            className={clsx(
                              className,
                              "flex overflow-x-auto pb-6",
                            )}
                            style={style}
                          >
                            <code className="px-4">
                              {tokens.map((line, lineIndex) => (
                                <div
                                  key={lineIndex}
                                  {...getLineProps({ line })}
                                >
                                  {line.map((token, tokenIndex) => (
                                    <span
                                      key={tokenIndex}
                                      {...getTokenProps({ token })}
                                    />
                                  ))}
                                </div>
                              ))}
                            </code>
                          </pre>
                        )}
                      </Highlight>
                    </div>
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
