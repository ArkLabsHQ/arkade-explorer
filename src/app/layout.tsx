import type { Metadata } from 'next';
import { AppProviders } from '@/providers/app-providers';
import { DynamicLayout } from '@/components/dynamic-layout';
import './globals.css';

export const metadata: Metadata = {
  title: 'Arkade Explorer',
  description: 'Explore Arkade protocol transactions, VTXOs, and addresses',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dawn" className="light" suppressHydrationWarning>
      <body className="antialiased">
        <AppProviders>
          <DynamicLayout>
            {children}
          </DynamicLayout>
        </AppProviders>
      </body>
    </html>
  );
}
