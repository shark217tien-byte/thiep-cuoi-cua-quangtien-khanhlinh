import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Thiệp cưới của chúng mình",
  description: "Một lời mời nhỏ cho ngày đặc biệt của chúng mình.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000")
};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="vi"><body>{children}</body></html>;
}
