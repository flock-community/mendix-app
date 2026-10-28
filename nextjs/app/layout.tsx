import { atlasStylesheets } from "@flock-community/atlas-ui";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: "Mendix",
    icons: { icon: [] }
};

/** index.html of the Mendix app: the compiled theme, the widget CSS and a #content root. */
export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en">
            <head>
                {atlasStylesheets.map(href => (
                    <link key={href} rel="stylesheet" href={href} />
                ))}
            </head>
            <body dir="ltr">
                <div id="content">{children}</div>
            </body>
        </html>
    );
}
