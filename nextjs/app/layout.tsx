import { atlasStylesheets } from "@flock-community/atlas-ui";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: { default: "Mendix", template: "Mendix - %s" },
    icons: { icon: [] }
};

/** index.html of the Mendix app: the widget CSS, the compiled theme and the icon fonts. Pages render #root (AppRoot). */
export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en-US">
            <head>
                {atlasStylesheets.map(href => (
                    <link key={href} rel="stylesheet" href={href} />
                ))}
            </head>
            <body dir="ltr">{children}</body>
        </html>
    );
}
