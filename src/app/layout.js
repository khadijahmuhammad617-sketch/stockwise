
import "./globals.css";
import StoreProvider from "../components/StoreProvider";
import ThemeProvider from "../components/ThemeProvider";
import Navigation from "../components/Navigation";

export const metadata = {
  title: "StockWise",
  description: "Inventory and Sales Management System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <StoreProvider>
            <Navigation />
            {children}
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
