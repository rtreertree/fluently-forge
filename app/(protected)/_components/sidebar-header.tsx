import React, { useState } from "react";
import { SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Anvil } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

const WavyText = ({ text, animate }: { text: string; animate: boolean }) => (
<span className="font-semibold">
{text.split("").map((char, i) => (
<span
key={i}
className={animate ? "inline-block wave-char" : "inline-block"}
style={{
animationDelay: animate ? `${i * 0.06}s` : undefined,
animationDuration: "0.5s",
animationFillMode: "both",
}}
>
{char === " " ? "\u00A0" : char}
</span>
))}
</span>
);

export const SidebarDashboardHeader = () => {
const [hovered, setHovered] = useState(false);

return (
<SidebarHeader>
<SidebarMenu>
<SidebarMenuItem>
<SidebarMenuButton
size="lg"
asChild
onMouseEnter={() => setHovered(true)}
onMouseLeave={() => setHovered(false)}
>
<a>
<div
className={`flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground ${
hovered ? "animate-anvil" : ""
}`}
>
<Anvil className={`size-4 ${hovered ? "animate-anvil" : ""}`} />
</div>
<div className="grid flex-1 text-left text-sm leading-tight">
<WavyText text="Fluently" animate={hovered} />
<WavyText text="Forge" animate={hovered} />
</div>
</a>
</SidebarMenuButton>
</SidebarMenuItem>
</SidebarMenu>
<style>{`
        @keyframes waveChar {
          0% { transform: translateY(0);}
          20% { transform: translateY(-12px) scale(1.2);}
          40% { transform: translateY(0) scale(1);}
          100% { transform: translateY(0);}
        }
        .wave-char {
          animation-name: waveChar;
        }
        @keyframes waveSmashShake {
          0% { transform: translateY(0); }
          10% { transform: translateY(-18px) rotate(-10deg); }
          20% { transform: translateY(-8px) rotate(10deg);}
          30% { transform: translateY(0) scaleY(1.4) scaleX(0.9);}
          40% { transform: translateY(0) scaleY(0.8) scaleX(1.1);}
          50% { transform: translateY(0) scaleY(1) scaleX(1);}
          60% { transform: translateX(-2px);}
          65% { transform: translateX(2px);}
          70% { transform: translateX(-2px);}
          75% { transform: translateX(2px);}
          80% { transform: translateX(-1px);}
          85% { transform: translateX(1px);}
          100% { transform: translateX(0);}
        }
        .animate-anvil {
          animation: waveSmashShake 0.8s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
</SidebarHeader>
);
};