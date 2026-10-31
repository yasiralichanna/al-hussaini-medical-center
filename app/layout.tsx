import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Al-Hussaini Medical Center | Ultrasound & Physiotherapy",
  description:
    "Visit Dr. Komal Awais for digital ultrasound and physiotherapy in Bhan Syedabad, Sindh. Call 0300-3032956 to arrange your visit.",
  icons: { icon: "/favicon.svg" },
  referrer: "no-referrer",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#home">
          Skip to content
        </a>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "MedicalClinic",
              name: "Al-Hussaini Digital Ultrasound and Physiotherapy Medical Center",
              telephone: "+923003032956",
              address: {
                "@type": "PostalAddress",
                streetAddress: "Near Admore Petroleum Pump, Old Bypass",
                addressLocality: "Bhan Syedabad",
                addressRegion: "Sindh",
                addressCountry: "PK",
              },
            }),
          }}
        />
      </body>
    </html>
  );
}
