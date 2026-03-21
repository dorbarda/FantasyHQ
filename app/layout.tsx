import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

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
      <body className="bg-[#F8FAFC] text-[#0F172A] flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-[220px] min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
