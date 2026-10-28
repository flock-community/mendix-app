"use client";

import { atlasIcon, Container, containerDesign, LanguageSelector, MenuBar, Placeholder, ScrollContainer } from "@flock-community/atlas-ui";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

/** The Responsive navigation profile's menu. */
const MENU = [{ caption: "Todos", href: "/p/todos", icon: atlasIcon("list-bullets") }];

/** System.Language objects; the app has one language. */
const LANGUAGES = [{ id: "en_US", caption: "English, United States" }];

/**
 * MyFirstModule.App_Default: a scroll container (Atlas responsive top bar
 * layout) with the menu bar and the language selector snippet on top and the
 * page in the center.
 */
export function AppDefaultLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    return (
        <ScrollContainer
            name="layoutContainer"
            className="layout-atlas layout-atlas-responsive-topbar"
            top={{
                className: "region-topbar",
                children: (
                    <Container
                        name="topbarContent"
                        className={`topbar-content ${containerDesign.flexRow} ${containerDesign.alignYCenter} ${containerDesign.disableRowWrap}`}
                        style={containerDesign.fillContainer}
                    >
                        <MenuBar name="mainMenu" items={MENU.map(item => ({ ...item, active: pathname === item.href, onNavigate: href => router.push(href) }))} />
                        {/* Snippet Atlas_Core.LanguageSelectorWidget. Demo users have no language set, so none shows as current. */}
                        <LanguageSelector name="languageSelector1" languages={LANGUAGES} hideForSingle={false} />
                    </Container>
                )
            }}
            center={{ className: "region-content", children: <Placeholder>{children}</Placeholder> }}
        />
    );
}

/** Atlas_Core.PopupLayout: the scroll container a popup page sits in. */
export function PopupLayout({ children }: { children: ReactNode }) {
    return <ScrollContainer name="scrollContainer1" center={{ className: "region-content", children: <Placeholder>{children}</Placeholder> }} />;
}
