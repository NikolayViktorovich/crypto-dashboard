import { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import './globals.css';

export const metadata = {
  title: 'Crypto Dashboard',
  description: 'Cryptocurrency dashboard with modern UI',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}