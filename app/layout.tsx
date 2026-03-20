import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: 'Fantasy HQ',
  description: 'Private NBA fantasy basketball league dashboard',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#F8F9FB] text-[#111827]">
        <Header />
        <main className="max-w-[1100px] mx-auto px-4 xl:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
