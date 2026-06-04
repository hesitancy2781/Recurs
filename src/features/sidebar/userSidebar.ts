import "./css/userSidebar.css";
import querySelectorAsync from "../../utility/querySelectorAsync";
import buildSidebar from "./buildSidebar";
import { getSubreddits } from "./getSubreddits";
import { isNewReddit, isOldReddit, getNotificationCount, createNotificationBadge } from "../notifications";

function createSidebarItem(
    text: string,
    link: string,
    icon: string,
    isActive: boolean,
    cls?: string | Array<string>
) {
    const item = document.createElement("a");
    if (cls !== undefined) {
        if (!Array.isArray(cls)) {
            cls = [cls];
        }
        item.classList.add(...cls);
    }
    item.href = link;
    item.classList.add("sidebar-item");

    if (icon.startsWith("http")) {
        const img = document.createElement("img");
        img.src = icon;
        img.width = 40;
        img.height = 40;
        item.prepend(img);
    } else {
        const iconEl = document.createElement("span");
        iconEl.classList.add("material-symbols-outlined", "ol-icon");
        iconEl.innerText = icon || "forum";
        item.appendChild(iconEl);
    }

    const labelEl = document.createElement("span");
    labelEl.classList.add("sidebar-text");
    labelEl.innerText = text;
    item.appendChild(labelEl);

    if (isActive) {
        item.classList.add("sidebar-item-active");
        item.removeAttribute("href");
    }
    return item;
}

function createSidebarSubheading(text: string, button?: HTMLButtonElement) {
    const item = document.createElement("p");
    const textEl = document.createElement("span");
    textEl.innerText = text;
    item.appendChild(textEl);
    item.classList.add("sidebar-headline");
    if (button) {
        item.appendChild(button);
    }
    return item;
}

async function setupMultireddits(parentContainer: HTMLDivElement) {
    await querySelectorAsync(".multis");
    const multis = document.querySelectorAll<HTMLAnchorElement>(
        '.multis > li > a:not([href="/r/multihub/"])'
    );
    if (multis.length > 0) {
        parentContainer.appendChild(document.createElement("hr"));
        parentContainer.appendChild(createSidebarSubheading("Multireddits"));
        for (const multi of multis) {
            parentContainer.appendChild(
                createSidebarItem(
                    multi.innerText,
                    multi.href,
                    "merge",
                    multi.href === location.href
                )
            );
        }
    }
}

async function setupSubreddits(
    parentContainer: HTMLDivElement,
    force?: boolean
) {
    const container = document.createElement("span");
    container.id = "oldlander-subredditlist";
    const refreshButton = document.createElement("button");
    refreshButton.classList.add("material-symbols-outlined", "ol-icon");
    refreshButton.innerText = "refresh";
    const refreshHandler = () => {
        refreshButton.removeEventListener("click", refreshHandler);
        console.log("refresh");
        refreshButton.classList.add("spin");
        setupSubreddits(parentContainer, true);
    };
    refreshButton.addEventListener("click", refreshHandler);

    container.appendChild(document.createElement("hr"));
    container.appendChild(createSidebarSubheading("Subreddits", refreshButton));
    container.appendChild(
        createSidebarItem("Random", "/r/random", "shuffle", false, [
            "oldlander-subreddit",
            "oldlander-random",
        ])
    );
    container.appendChild(
        createSidebarItem("Random NSFW", "/r/randnsfw", "18_up_rating", false, [
            "oldlander-subreddit",
            "oldlander-randNsfw",
        ])
    );
    const subs = await getSubreddits(!!force);
    for (const subreddit of subs) {
        container.appendChild(
            createSidebarItem(
                subreddit.data.display_name,
                subreddit.data.url,
                subreddit.data.icon_img,
                location.pathname === subreddit.data.url,
                "oldlander-subreddit"
            )
        );
    }
    document
        .querySelectorAll("#oldlander-subredditlist")
        .forEach((el) => el.remove());
    parentContainer.appendChild(container);
}

async function buildHeaderItems(parentContainer: HTMLDivElement) {
    // Try to find header - works for both old and new Reddit
    let rheader = await querySelectorAsync("#header-bottom-right");
    if (!rheader) {
        // Try new Reddit header structure
        rheader = await querySelectorAsync("header");
    }
    if (!rheader) {
        console.warn("Could not find header element");
        return;
    }

    parentContainer.appendChild(document.createElement("hr"));
    if (document.body.classList.contains("res")) {
        const prefurl = new URL(location.toString());
        prefurl.hash = "res:settings";
        parentContainer.appendChild(
            createSidebarItem(
                "RES settings console",
                prefurl.toString(),
                "settings_applications",
                false
            )
        );
    }
    const prefurl = new URL(location.toString());
    prefurl.hash = "olPreferences";
    parentContainer.appendChild(
        createSidebarItem(
            "OldLander preferences",
            prefurl.toString(),
            "build_circle",
            false
        )
    );

    // Find user link - works for both old and new Reddit
    let userlink = rheader.querySelector<HTMLAnchorElement>(".user a");
    if (!userlink) {
        // Try new Reddit user dropdown
        userlink = rheader.querySelector<HTMLAnchorElement>("[href^='/user/']");
    }
    
    if (userlink) {
        if (userlink.innerText.includes("Log in") || userlink.innerText.includes("Login") || userlink.innerText.includes("Sign in")) {
            const loginitem = createSidebarItem(
                "Log in",
                "javascript:void(0)",
                "login",
                false
            );
            loginitem.addEventListener("click", () => {
                userlink.click();
            });
            parentContainer.appendChild(loginitem);
            return;
        }
        parentContainer.appendChild(
            createSidebarItem(
                userlink.text,
                userlink.href,
                "person",
                location.href === userlink.href
            )
        );
    }

    // Handle mail/notifications - works for both old and new Reddit
    let mailHref = "/message/inbox/";
    let mailIcon = "mail";
    let mailText = "Messages";
    
    // Check if we're on new Reddit and adjust accordingly
    if (isNewReddit()) {
        mailHref = "/notifications";
        mailIcon = "notifications";
        mailText = "Notifications";
    }
    
    const mail = rheader.querySelector<HTMLAnchorElement>("#mail");
    if (mail) {
        // Use the existing mail element from old Reddit
        mailIcon = mail.classList.contains("nohavemail")
            ? "mail"
            : "mark_email_unread";
        mailHref = mail.href;
    }
    
    // Create the messages/notifications sidebar item
    const messagesItem = createSidebarItem(
        mailText,
        mailHref,
        mailIcon,
        location.href === mailHref || location.pathname.includes("/message/") || location.pathname.includes("/notifications")
    );
    
    // Add notification badge with count
    const updateNotificationBadge = async () => {
        try {
            const count = await getNotificationCount();
            // Remove existing badges
            const existingBadge = messagesItem.querySelector(".notification-badge");
            if (existingBadge) {
                existingBadge.remove();
            }
            
            // Add new badge if there are notifications
            if (count.total > 0) {
                const badge = createNotificationBadge(count.total, "total");
                // Find the text span and append badge after it
                const textSpan = messagesItem.querySelector(".sidebar-text");
                if (textSpan) {
                    textSpan.appendChild(badge);
                } else {
                    messagesItem.appendChild(badge);
                }
            }
        } catch (error) {
            console.error("Error updating notification badge:", error);
        }
    };
    
    // Initial update
    updateNotificationBadge();
    
    // Update periodically (every 5 minutes)
    setInterval(updateNotificationBadge, 5 * 60 * 1000);
    
    parentContainer.appendChild(messagesItem);

    const prefslink = "https://old.reddit.com/prefs/";
    parentContainer.appendChild(
        createSidebarItem(
            "Reddit Preferences",
            prefslink,
            "settings",
            location.href === prefslink
        )
    );

    const logoutItem = createSidebarItem(
        "Log out",
        "javascript:void(0)",
        "logout",
        false
    );
    logoutItem.onclick = () => {
        // Try to find logout link - works for both old and new Reddit
        let logoutLink = rheader.querySelector<HTMLAnchorElement>("form.logout a");
        if (!logoutLink) {
            // Try new Reddit logout button
            logoutLink = rheader.querySelector<HTMLAnchorElement>("[href*='/logout']");
        }
        if (logoutLink) {
            logoutLink.click();
        } else {
            console.error("Couldn't find logout link!");
        }
    };
    parentContainer.appendChild(logoutItem);
}

export default async function buildUserSidebar() {
    const body = await querySelectorAsync("body");
    body.classList.remove("with-listing-chooser");

    const innerSidebar = document.createElement("div");
    const { sidebar: sidebar, activeToggle: activeToggle } = buildSidebar(
        innerSidebar,
        "user-sidebar",
        "user-sidebar-close",
        true
    );

    innerSidebar.innerHTML = `<p class="sidebar-apptitle">🛸 OldLander</p>`;
    innerSidebar.classList.add("side");
    innerSidebar.appendChild(
        createSidebarItem("Homepage", "/", "home", location.pathname == "/")
    );

    const headerItems = document.createElement("div");
    innerSidebar.appendChild(headerItems);
    const multireddits = document.createElement("div");
    innerSidebar.appendChild(multireddits);
    const subreddits = document.createElement("div");
    innerSidebar.appendChild(subreddits);

    // do not await, let the items load in in their own time
    buildHeaderItems(headerItems);
    setupMultireddits(multireddits);
    setupSubreddits(subreddits);

    body.appendChild(sidebar);
    return { sidebar: sidebar, activeToggle: activeToggle };
}
