import { SiteProvider } from '../components/Site';
import EdgeSwipeGuard from '../components/EdgeSwipeGuard';

export const metadata = {
  title: 'THV',
  description: 'הרפתקאות בטבע',
};

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&display=swap" />
      </head>
      <body style={{ margin: 0 }}>
        <EdgeSwipeGuard />
        <SiteProvider>{children}</SiteProvider>
      </body>
    </html>
  );
}
