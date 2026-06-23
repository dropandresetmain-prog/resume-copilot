import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Career Resume Copilot",
  description:
    "Upload DOCX resumes and build a per-resume experience inventory.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full bg-slate-50 text-slate-900 antialiased"
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
