import React from "react";

const loaderSize = 60;
const dotSize = 10;
const orbitRadius = 22;

const ORBIT_COLORS = ["#262626", "#787878", "#000000"];


interface LoaderProps {
    text: string;
}

const Loader = ({ text }: LoaderProps) => (
    <div className="flex flex-col md:flex-row items-center justify-center gap-4 p-5 min-h-screen">
    <div style={containerStyle}>
        <div style={{
            ...orbitContainerStyle,
            width: loaderSize, height: loaderSize,
        }}>
            {/* Center Dot */}
            <div
                style={{
                    ...centerDotStyle,
                    width: dotSize,
                    height: dotSize,
                    left: (loaderSize - dotSize) / 2,
                    top: (loaderSize - dotSize) / 2
                }}
            />
            {/* Orbiting dots */}
            {ORBIT_COLORS.map((color, i) => (
                <div
                    key={color}
                    style={{
                        ...orbitDotStyle,
                        width: dotSize, height: dotSize,
                        left: (loaderSize - dotSize) / 2,
                        top: (loaderSize - dotSize) / 2,
                        background: color,
                        animationDelay: `${i * 0.18}s`
                    }}
                />
            ))}
            {/* Animation Styles */}
            <style>{`
        @keyframes orbit {
          0% { transform: rotate(0deg) translate(${orbitRadius}px) scale(1); }
          50% { transform: rotate(180deg) translate(${orbitRadius}px) scale(1.4);}
          100% { transform: rotate(360deg) translate(${orbitRadius}px) scale(1);}
        }
        @keyframes pulseCenter {
          0%, 100% { transform: scale(1);}
          50% { transform: scale(1.2);}
        }
      `}</style>
        </div>
        <span style={loadingTextStyle}>{text}</span>
    </div>
    </div>
);

const containerStyle: React.CSSProperties = {
    height: "100vh",
    width: "100vw",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#fff"
};

const orbitContainerStyle = {
    position: "relative" as const,
    marginBottom: 22
};

const centerDotStyle = {
    position: "absolute" as const,
    borderRadius: "50%",
    background: "#222",
    animation: "pulseCenter 1.5s infinite"
};

const orbitDotStyle = {
    position: "absolute" as const,
    borderRadius: "50%",
    boxShadow: "0 1px 4px rgba(68,68,90,0.07)",
    animation: `orbit 1.5s cubic-bezier(.77,0,.18,1) infinite`
};

const loadingTextStyle = {
    color: "#444",
    letterSpacing: "0.2em",
    fontSize: 17,
    fontWeight: 400
};

export default Loader;