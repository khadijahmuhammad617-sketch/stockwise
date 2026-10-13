
import "./globals.css";
import StoreProvider from "../components/StoreProvider";

export const metadata = {
  title: "StockWise",
  description: "Inventory and Sales Management System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
