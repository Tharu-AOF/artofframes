// ============================================================
// PARTNER PROGRAM — bilingual page content.
//
// The Art of Frames Partner Program page renders in Sinhala by
// default and can be switched to English with a page-local toggle.
// All copy lives here, keyed by language, so the component stays
// purely presentational.
//
//   Lang "si" — Sinhala (default)
//   Lang "en" — English
// ============================================================

export type Lang = "si" | "en";

export interface PartnerModel {
  id: "sales" | "reseller";
  number: string;
  accent: string; // brand color for the card
  name: string;
  tagline: string;
  body: string;
  note: string; // highlighted callout line
  earn?: string; // commission line (sales partner)
  benefitsTitle: string; // "What You Get"
  benefits: string[];
  investmentLabel: string;
  investment: string;
  whoForTitle: string; // "Who Is This For?"
  whoFor: string;
}

export interface ComparisonModel {
  id: "sales" | "reseller";
  accent: string;
  name: string;
  headline: string;
  steps: string[];
}

export interface PartnerContent {
  hero: {
    eyebrow: string;
    titleAccent: string;
    title: string;
    intro: string;
    choose: string;
  };
  models: PartnerModel[];
  compareEyebrow: string;
  compareTitleAccent: string;
  compareTitle: string;
  compare: ComparisonModel[];
  cta: {
    titleAccent: string;
    title: string;
    text: string;
    line: string;
    button: string;
    terms: string;
    whatsappMessage: string;
  };
}

export const partnerProgramContent: Record<Lang, PartnerContent> = {
  // ─────────────────────────── සිංහල (default) ───────────────────────────
  si: {
    hero: {
      eyebrow: "Art of Frames · Partner Program",
      titleAccent: "ඔබේ network එකෙන්",
      title: "ආදායමක් උපයන්න",
      intro:
        "Art of Frames එක්ක Partner කෙනෙක් වෙලා, අපේ products promote කරලා හෝ resell කරලා ඔබට අමතර ආදායමක් උපයන්න.",
      choose: "ඔබට ගැළපෙන partner model එක තෝරගන්න.",
    },
    models: [
      {
        id: "sales",
        number: "01",
        accent: "#9d4edd",
        name: "Sales Partner",
        tagline: "Products promote කරන්න. අපි orders fulfil කරන්නම්.",
        body:
          "ඔබට කිසිම stock එකක් මිලදී ගන්න අවශ්‍ය නැහැ. අපි ලබාදෙන product photos, videos සහ marketing materials භාවිතා කරලා ඔබට Facebook, Instagram, TikTok, WhatsApp හෝ වෙනත් ඕනෑම platform එකක Art of Frames products promote කරන්න පුළුවන්. Customer කෙනෙක් order එකක් ලබාදුන්නාම, order details අපිට ලබාදෙන්න.",
        note:
          "Product එක නිෂ්පාදනය කිරීමේ සිට packing සහ delivery දක්වා සියල්ල අපි handle කරනවා.",
        earn:
          "සාර්ථකව complete වන සෑම order එකකටම ඔබට commission එකක් ලැබෙනවා.",
        benefitsTitle: "ඔබට ලැබෙන වාසි",
        benefits: [
          "Stock අවශ්‍ය නැහැ",
          "Upfront investment එකක් නැහැ",
          "Production අපි handle කරනවා",
          "Packing & Delivery අපි handle කරනවා",
          "Marketing materials අපෙන්",
          "සෑම successful order එකකටම commission",
        ],
        investmentLabel: "Investment",
        investment: "Rs. 0",
        whoForTitle: "කාටද මේක සුදුසු?",
        whoFor:
          "Social media හරහා products promote කරන්න කැමති අයට, customers හොයාගන්න පුළුවන් අයට, students, content creators, page owners සහ side income එකක් හොයන ඕනෑම කෙනෙකුට.",
      },
      {
        id: "reseller",
        number: "02",
        accent: "#f97316",
        name: "Reseller",
        tagline: "අපෙන් wholesale price එකට ගන්න. ඔබේ මිලකට විකුණන්න.",
        body:
          "ඔබට Art of Frames products bulk quantity එකකින් special wholesale prices යටතේ මිලදීගෙන, ඔබේ customers වෙත resell කරන්න පුළුවන්. ඔබට තමන්ගේ selling price එක තීරණය කරන්න පුළුවන්.",
        note:
          "ඔබ මිලදී ගන්නා wholesale price එක සහ ඔබේ selling price එක අතර වෙනස ඔබේ profit එකයි.",
        benefitsTitle: "ඔබට ලැබෙන වාසි",
        benefits: [
          "Bulk orders සඳහා special wholesale discounts",
          "ඔබේම selling price එක තීරණය කරන්න",
          "ඔබේම profit margin එක තීරණය කරන්න",
          "Products online හෝ offline resell කරන්න පුළුවන්",
          "ඔබේම customer base එක build කරගන්න පුළුවන්",
        ],
        investmentLabel: "Investment",
        investment: "Products purchase කිරීම සඳහා පමණයි",
        whoForTitle: "කාටද මේක සුදුසු?",
        whoFor:
          "තමන්ගේම online store එකක්, gift business එකක්, social media page එකක් හෝ physical shop එකක් හරහා products sell කරන්න කැමති අයට.",
      },
    ],
    compareEyebrow: "Models සසඳන්න",
    compareTitleAccent: "ඔබට ගැළපෙන්නේ කුමන",
    compareTitle: "Partner Model එකද?",
    compare: [
      {
        id: "sales",
        accent: "#9d4edd",
        name: "Sales Partner",
        headline: "Investment නැතුව start කරන්න.",
        steps: ["Customers හොයන්න", "Orders අපිට දෙන්න", "Commission earn කරන්න"],
      },
      {
        id: "reseller",
        accent: "#f97316",
        name: "Reseller",
        headline: "Wholesale price එකට products ගන්න.",
        steps: ["ඔබේ මිලකට විකුණන්න", "Profit එක ඔබට"],
      },
    ],
    cta: {
      titleAccent: "Partner කෙනෙක් වෙන්න",
      title: "සූදානම්ද?",
      text:
        "ඔබේ social media network එක, customer base එක හෝ sales skills එක income opportunity එකක් බවට පත් කරගන්න.",
      line: "අදම Art of Frames Partner කෙනෙක් වෙන්න.",
      button: "Become a Partner",
      terms: "Terms & Conditions apply.",
      whatsappMessage:
        "Hello Art of Frames! මට Art of Frames Partner Program එකට join වෙන්න කැමතියි.",
    },
  },

  // ─────────────────────────────── English ───────────────────────────────
  en: {
    hero: {
      eyebrow: "Art of Frames · Partner Program",
      titleAccent: "Turn your network into",
      title: "an Income Opportunity",
      intro:
        "Become an Art of Frames Partner and earn by promoting or reselling our products.",
      choose: "Choose the partner model that works best for you.",
    },
    models: [
      {
        id: "sales",
        number: "01",
        accent: "#9d4edd",
        name: "Sales Partner",
        tagline: "Promote our products. We handle the orders.",
        body:
          "You don't need to purchase or maintain any stock. Use the product photos, videos, and marketing materials we provide to promote Art of Frames products through Facebook, Instagram, TikTok, WhatsApp, or any other platform. When you receive an order from a customer, simply send the order details to us.",
        note: "We handle everything from production and packing to delivery.",
        earn:
          "You earn a commission for every successfully completed order you generate.",
        benefitsTitle: "What You Get",
        benefits: [
          "No stock required",
          "No upfront investment",
          "Production handled by us",
          "Packing & delivery handled by us",
          "Marketing materials provided",
          "Commission on every successful order",
        ],
        investmentLabel: "Investment",
        investment: "Rs. 0",
        whoForTitle: "Who Is This For?",
        whoFor:
          "Perfect for social media users, students, content creators, page owners, sales-minded individuals, and anyone looking to earn an additional income without investing in stock.",
      },
      {
        id: "reseller",
        number: "02",
        accent: "#f97316",
        name: "Reseller",
        tagline: "Buy at wholesale prices. Sell at your own price.",
        body:
          "Purchase Art of Frames products in bulk at special wholesale prices and resell them to your own customers. You decide your own selling price.",
        note:
          "The difference between your wholesale purchase price and your selling price is your profit.",
        benefitsTitle: "What You Get",
        benefits: [
          "Special wholesale discounts on bulk orders",
          "Set your own selling price",
          "Choose your own profit margin",
          "Sell online or offline",
          "Build your own customer base",
        ],
        investmentLabel: "Investment",
        investment: "Only for purchasing products",
        whoForTitle: "Who Is This For?",
        whoFor:
          "Ideal for people who run or want to start an online store, gift business, social media page, or physical retail business.",
      },
    ],
    compareEyebrow: "Compare the Models",
    compareTitleAccent: "Which partner model",
    compareTitle: "Is Right For You?",
    compare: [
      {
        id: "sales",
        accent: "#9d4edd",
        name: "Sales Partner",
        headline: "Start with zero investment.",
        steps: ["Find customers", "Send us the orders", "Earn commission"],
      },
      {
        id: "reseller",
        accent: "#f97316",
        name: "Reseller",
        headline: "Buy at wholesale prices.",
        steps: ["Sell at your own price", "Keep the profit"],
      },
    ],
    cta: {
      titleAccent: "Ready to become",
      title: "an Art of Frames Partner?",
      text:
        "Turn your social media network, customer base, or sales skills into an additional income opportunity.",
      line: "Become an Art of Frames Partner today.",
      button: "Become a Partner",
      terms: "Terms & Conditions apply.",
      whatsappMessage:
        "Hello Art of Frames! I'd like to join the Art of Frames Partner Program.",
    },
  },
};
