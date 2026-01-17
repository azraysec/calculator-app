import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Warm Intro Graph (WIG)',
  description: 'Professional networking platform for warm introductions',
  keywords: ['networking', 'introductions', 'professional', 'connections'],
  authors: [{ name: 'WIG Team' }],
  openGraph: {
    title: 'Warm Intro Graph (WIG)',
    description: 'Professional networking platform for warm introductions',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
