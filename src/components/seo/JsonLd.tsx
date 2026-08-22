import React from "react";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://artofframes.netlify.app";

export default function JsonLd() {
  const schemaData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Store",
        "@id": `${SITE_URL}/#organization`,
        name: "Art of Frames",
        alternateName: [
          "artofframes",
          "Art Of Frames Sri Lanka",
          "Art Of Frames Studio",
          "artofframes1",
        ],
        url: SITE_URL,
        logo: `${SITE_URL}/images/aof-logo.png`,
        image: `${SITE_URL}/images/aof-logo.png`,
        description:
          "Sri Lanka's destination for bespoke wooden photo frames, custom engraved gifts, laser-cut wall decor, and customized sign boards.",
        telephone: "+94750350109",
        email: "artofframes@gmail.com",
        address: {
          "@type": "PostalAddress",
          addressCountry: "LK",
          addressRegion: "Western Province",
        },
        sameAs: [
          "https://web.facebook.com/artofframes1",
          "https://www.instagram.com/art.of.frames/",
          "https://www.tiktok.com/@artofframes",
        ],
        priceRange: "LKR",
        paymentAccepted: "Cash on Delivery, Bank Transfer, Online Payment",
        currenciesAccepted: "LKR",
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: "Art of Frames",
        alternateName: "artofframes",
        publisher: {
          "@id": `${SITE_URL}/#organization`,
        },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_URL}/shop?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
}
