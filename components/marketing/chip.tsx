import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedGradientText } from "@/components/magic-ui/animated-gradient-text";
import Link from "next/link";
import Image from "next/image";

function PabrikStartupChip() {
    return (
        <Link
            href="https://pabrikstartup.id"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative max-w-sm mx-auto flex items-center justify-center rounded-full px-4 py-1.5 shadow-[inset_0_-8px_10px_#8fdfff1f] transition-shadow duration-500 ease-out hover:shadow-[inset_0_-5px_10px_#8fdfff3f]"
        >
            <span
                className={cn(
                    "animate-gradient absolute inset-0 block h-full w-full rounded-[inherit] bg-linear-to-r from-[#ffaa40]/50 via-[#9c40ff]/50 to-[#ffaa40]/50 bg-size-[300%_100%] p-px"
                )}
                style={{
                    WebkitMask:
                        "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                    WebkitMaskComposite: "destination-out",
                    mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                    maskComposite: "subtract",
                    WebkitClipPath: "padding-box",
                }}
            />
            <AnimatedGradientText className="text-sm font-medium">
                Backed by {" "}
                <Image
                    src="/logo-pabrik-startup.png"
                    alt="Pabrik Startup Logo"
                    width={24}
                    height={24}
                    className="mx-1 inline-block h-5 w-5 rounded-full"
                />
                {" "} Pabrik Startup
            </AnimatedGradientText>
            <ChevronRight className="ml-1 size-4 stroke-neutral-500 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
        </Link>
    );
}

export default PabrikStartupChip;
