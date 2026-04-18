import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

const BASE_URL = 'https://fantasy-hq-ten.vercel.app';

export const metadata: Metadata = {
  title: 'Fantasy HQ',
  description: 'Private NBA fantasy basketball league dashboard',
  metadataBase: new URL(BASE_URL),
  openGraph: {
    title: 'Fantasy HQ',
    description: 'Private NBA fantasy basketball league dashboard',
    url: BASE_URL,
    siteName: 'Fantasy HQ',
    images: [{ url: '/logo.png' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fantasy HQ',
    description: 'Private NBA fantasy basketball league dashboard',
    images: ['/logo.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#F8FAFC] text-[#0F172A] flex min-h-screen">
        <div className="print:hidden">
          <Sidebar />
        </div>
        {/* pt-14 on mobile = space for fixed top bar; md:pt-0 on desktop = no top bar */}
        {/* pb-16 on mobile = space for bottom nav; md:pb-0 on desktop */}
        <main className="flex-1 md:ml-[220px] print:ml-0 min-h-screen pt-14 pb-16 md:pt-0 md:pb-0 print:pt-0 print:pb-0">
          {children}
        </main>
      </body>
    </html>
  );
}
