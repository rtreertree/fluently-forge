const AuthLayout = ({ children, }: Readonly<{children: React.ReactNode}>) => {
    return (
        <div className="flex h-full flex-col items-center justify-center bg-slate-800">
            {children}
        </div>
    );
}
export default AuthLayout;