export const metadata = {
  title: 'THV',
  description: 'הרפתקאות בטבע',
};

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
