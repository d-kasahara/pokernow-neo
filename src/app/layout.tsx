import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PokerNow Neo - オンラインポーカートーナメント',
  description: '会員登録不要！最大9人で遊べるオンラインポーカートーナメント',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-[#0a0a1a]">
        {children}
      </body>
    </html>
  );
}
