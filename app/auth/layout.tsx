export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-full p-4 flex items-center justify-center">
      {children}
    </div>
  )
}
