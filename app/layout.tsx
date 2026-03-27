export const metadata = {
  title: "LAG Auto AI Buddy",
  description: "AI-powered sales reply generator for LAG Auto dealership.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
