export const metadata = {
  title: "LAG Auto — AutoReply AI",
  description: "Sales email generator for LAG Auto dealership",
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
