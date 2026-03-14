import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import TopNav from "@/components/TopNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "School Transport Management System",
  description: "Manage school buses, students, routes, and transportation logistics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Script
          id="strip-extension-attrs"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var attrs = [
                  'bis_skin_checked',
                  'data-new-gr-c-s-check-loaded',
                  'data-gr-ext-installed'
                ];

                function strip(root) {
                  if (!root || !root.querySelectorAll) return;
                  for (var i = 0; i < attrs.length; i++) {
                    var attr = attrs[i];
                    if (root.hasAttribute && root.hasAttribute(attr)) {
                      root.removeAttribute(attr);
                    }
                    var nodes = root.querySelectorAll('[' + attr + ']');
                    for (var j = 0; j < nodes.length; j++) {
                      nodes[j].removeAttribute(attr);
                    }
                  }
                }

                strip(document.documentElement);

                var obs = new MutationObserver(function (mutations) {
                  for (var i = 0; i < mutations.length; i++) {
                    var m = mutations[i];
                    if (m.type === 'attributes' && m.target) {
                      strip(m.target);
                    }
                    if (m.addedNodes && m.addedNodes.length) {
                      for (var k = 0; k < m.addedNodes.length; k++) {
                        strip(m.addedNodes[k]);
                      }
                    }
                  }
                });

                obs.observe(document.documentElement, {
                  subtree: true,
                  childList: true,
                  attributes: true,
                });
              })();
            `,
          }}
        />
        <TopNav />
        {children}
      </body>
    </html>
  );
}
