import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Viva la Vida | Passeios de Barco e Lancha em Florianópolis",
  description: "Viva experiências inesquecíveis! Passeios de barco e lancha em Florianópolis. Ilha do Campeche, Costa da Lagoa, Porto Belo e muito mais. Reserve agora pelo WhatsApp!",
  keywords: "passeio de lancha florianópolis, aluguel de lancha, ilha do campeche, costa da lagoa, passeio de barco, florianópolis turismo",
  openGraph: {
    title: "Viva la Vida | Passeios de Barco e Lancha em Florianópolis",
    description: "Viva experiências inesquecíveis! Passeios de barco e lancha em Florianópolis.",
    type: "website",
    locale: "pt_BR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

