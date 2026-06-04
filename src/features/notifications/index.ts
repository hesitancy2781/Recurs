import { OLFeature, SettingToggle, SettingSlider } from "../base";
import querySelectorAsync from "../../utility/querySelectorAsync";
import { store } from "../../extensionPreferences";
import "./css/index.css";

export interface Notification {
    id: string;
    type: "comment" | "post" | "mention" | "message" | "other";
    title: string;
    body: string;
    author: string;
    subreddit: string;
    permalink: string;
    timestamp: number;
    read: boolean;
    icon: string;
}

export interface NotificationCount {
    messages: number;
    comments: number;
    mentions: number;
    total: number;
}

/**
 * Fetches notification count from old Reddit
 */
async function fetchOldRedditNotificationCount(): Promise<NotificationCount> {
    try {
        const response = await fetch("https://old.reddit.com/message/unread/.json?limit=1");
        const data = await response.json();
        
        const count: NotificationCount = {
            messages: 0,
            comments: 0,
            mentions: 0,
            total: 0
        };
        
        if (data.data && data.data.children) {
            count.total = data.data.children.length;
            // Old reddit doesn't distinguish between types in this endpoint
            count.messages = count.total;
        }
        
        return count;
    } catch (error) {
        console.error("Error fetching old Reddit notification count:", error);
        return { messages: 0, comments: 0, mentions: 0, total: 0 };
    }
}

/**
 * Fetches notification count from new Reddit API
 */
async function fetchNewRedditNotificationCount(): Promise<NotificationCount> {
    try {
        // New Reddit uses GraphQL API for notifications
        const response = await fetch("https://gql.reddit.com/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Apollo-Require-Preflight": "true"
            },
            body: JSON.stringify({
                query: `query NotificationsQuery {
                    me {
                        unreadMessageCount
                        newUnreadMessageCount
                        unreadCommentCount
                        newUnreadCommentCount
                    }
                }`
            })
        });
        
        const data = await response.json();
        const count: NotificationCount = {
            messages: 0,
            comments: 0,
            mentions: 0,
            total: 0
        };
        
        if (data.data && data.data.me) {
            count.messages = data.data.me.unreadMessageCount || data.data.me.newUnreadMessageCount || 0;
            count.comments = data.data.me.unreadCommentCount || data.data.me.newUnreadCommentCount || 0;
            count.total = count.messages + count.comments;
        }
        
        return count;
    } catch (error) {
        console.error("Error fetching new Reddit notification count:", error);
        return { messages: 0, comments: 0, mentions: 0, total: 0 };
    }
}

/**
 * Fetches actual notifications from new Reddit
 */
async function fetchNewRedditNotifications(limit: number = 10): Promise<Notification[]> {
    const notifications: Notification[] = [];
    
    try {
        // Try to fetch from new Reddit API
        const response = await fetch("https://gql.reddit.com/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Apollo-Require-Preflight": "true"
            },
            body: JSON.stringify({
                query: `query NotificationsQuery($limit: Int!) {
                    me {
                        notifications(first: $limit) {
                            edges {
                                node {
                                    id
                                    type
                                    title
                                    body
                                    author {
                                        name
                                    }
                                    subreddit {
                                        name
                                    }
                                    permalink
                                    createdUtc
                                    read
                                }
                            }
                        }
                    }
                }`,
                variables: { limit }
            })
        });
        
        const data = await response.json();
        
        if (data.data && data.data.me && data.data.me.notifications) {
            for (const edge of data.data.me.notifications.edges) {
                if (!edge || !edge.node) continue;
                
                const node = edge.node;
                const type = node.type?.toLowerCase() || "other";
                
                // Map new Reddit notification types to our types
                let mappedType: Notification["type"] = "other";
                if (type.includes("comment")) mappedType = "comment";
                else if (type.includes("post")) mappedType = "post";
                else if (type.includes("mention")) mappedType = "mention";
                else if (type.includes("message")) mappedType = "message";
                
                // Map type to icon
                let icon = "notifications";
                switch (mappedType) {
                    case "comment": icon = "comment"; break;
                    case "post": icon = "article"; break;
                    case "mention": icon = "alternate_email"; break;
                    case "message": icon = "mail"; break;
                }
                
                notifications.push({
                    id: node.id,
                    type: mappedType,
                    title: node.title || "Notification",
                    body: node.body || "",
                    author: node.author?.name || "Unknown",
                    subreddit: node.subreddit?.name || "",
                    permalink: node.permalink || "#",
                    timestamp: node.createdUtc ? node.createdUtc * 1000 : Date.now(),
                    read: node.read || false,
                    icon: icon
                });
            }
        }
    } catch (error) {
        console.error("Error fetching new Reddit notifications:", error);
    }
    
    return notifications;
}

/**
 * Fetches notifications from old Reddit
 */
async function fetchOldRedditNotifications(limit: number = 10): Promise<Notification[]> {
    const notifications: Notification[] = [];
    
    try {
        // Fetch messages
        const messagesResponse = await fetch(`https://old.reddit.com/message/inbox/.json?limit=${limit}`);
        const messagesData = await messagesResponse.json();
        
        if (messagesData.data && messagesData.data.children) {
            for (const child of messagesData.data.children) {
                const message = child.data;
                notifications.push({
                    id: message.id,
                    type: "message",
                    title: message.subject || "Message",
                    body: message.body || "",
                    author: message.author || "Unknown",
                    subreddit: "",
                    permalink: message.context || `#",
                    timestamp: message.created_utc ? message.created_utc * 1000 : Date.now(),
                    read: message.new === false, // If new is false, it's read
                    icon: "mail"
                });
            }
        }
        
        // Fetch comments
        const commentsResponse = await fetch(`https://old.reddit.com/message/comments/.json?limit=${limit}`);
        const commentsData = await commentsResponse.json();
        
        if (commentsData.data && commentsData.data.children) {
            for (const child of commentsData.data.children) {
                const comment = child.data;
                notifications.push({
                    id: comment.id,
                    type: "comment",
                    title: comment.link_title || "Comment",
                    body: comment.body || "",
                    author: comment.author || "Unknown",
                    subreddit: comment.subreddit || "",
                    permalink: comment.context || `#",
                    timestamp: comment.created_utc ? comment.created_utc * 1000 : Date.now(),
                    read: comment.new === false,
                    icon: "comment"
                });
            }
        }
        
        // Fetch mentions
        const mentionsResponse = await fetch(`https://old.reddit.com/message/mentions/.json?limit=${limit}`);
        const mentionsData = await mentionsResponse.json();
        
        if (mentionsData.data && mentionsData.data.children) {
            for (const child of mentionsData.data.children) {
                const mention = child.data;
                notifications.push({
                    id: mention.id,
                    type: "mention",
                    title: mention.link_title || "Mention",
                    body: mention.body || "",
                    author: mention.author || "Unknown",
                    subreddit: mention.subreddit || "",
                    permalink: mention.context || `#",
                    timestamp: mention.created_utc ? mention.created_utc * 1000 : Date.now(),
                    read: mention.new === false,
                    icon: "alternate_email"
                });
            }
        }
        
        // Sort by timestamp (newest first)
        notifications.sort((a, b) => b.timestamp - a.timestamp);
        
    } catch (error) {
        console.error("Error fetching old Reddit notifications:", error);
    }
    
    return notifications.slice(0, limit);
}

/**
 * Checks if we're on new Reddit
 */
function isNewReddit(): boolean {
    return window.location.hostname === "www.reddit.com" || 
           window.location.hostname === "reddit.com" ||
           (window.location.hostname.includes("reddit.com") && 
            !window.location.hostname.includes("old.reddit.com"));
}

/**
 * Checks if we're on old Reddit
 */
function isOldReddit(): boolean {
    return window.location.hostname === "old.reddit.com" ||
           window.location.hostname === "np.reddit.com" ||
           window.location.hostname === "new.reddit.com";
}

/**
 * Gets the appropriate notification count based on current Reddit version
 */
async function getNotificationCount(): Promise<NotificationCount> {
    if (isNewReddit()) {
        return fetchNewRedditNotificationCount();
    } else {
        return fetchOldRedditNotificationCount();
    }
}

/**
 * Gets notifications from the appropriate Reddit version
 */
async function getNotifications(limit: number = 10): Promise<Notification[]> {
    if (isNewReddit()) {
        return fetchNewRedditNotifications(limit);
    } else {
        return fetchOldRedditNotifications(limit);
    }
}

/**
 * Creates a notification badge element
 */
function createNotificationBadge(count: number, type: "messages" | "comments" | "mentions" | "total"): HTMLElement {
    const badge = document.createElement("span");
    badge.className = `notification-badge notification-badge-${type}`;
    badge.textContent = count > 0 ? count.toString() : "";
    badge.style.display = count > 0 ? "inline" : "none";
    return badge;
}

/**
 * Creates a notification item for the sidebar
 */
function createNotificationItem(notification: Notification): HTMLElement {
    const item = document.createElement("a");
    item.href = notification.permalink;
    item.className = `notification-item ${notification.read ? "read" : "unread"}`;
    
    const icon = document.createElement("span");
    icon.className = "material-symbols-outlined notification-icon";
    icon.textContent = notification.icon;
    item.appendChild(icon);
    
    const content = document.createElement("div");
    content.className = "notification-content";
    
    const title = document.createElement("p");
    title.className = "notification-title";
    title.textContent = notification.title;
    content.appendChild(title);
    
    const body = document.createElement("p");
    body.className = "notification-body";
    body.textContent = notification.body.length > 100 ? 
        notification.body.substring(0, 100) + "..." : notification.body;
    content.appendChild(body);
    
    const meta = document.createElement("div");
    meta.className = "notification-meta";
    
    const author = document.createElement("span");
    author.className = "notification-author";
    author.textContent = notification.author;
    meta.appendChild(author);
    
    if (notification.subreddit) {
        const subreddit = document.createElement("span");
        subreddit.className = "notification-subreddit";
        subreddit.textContent = `r/${notification.subreddit}`;
        meta.appendChild(subreddit);
    }
    
    const time = document.createElement("span");
    time.className = "notification-time";
    const now = Date.now();
    const diff = now - notification.timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days > 0) {
        time.textContent = `${days}d ago`;
    } else if (hours > 0) {
        time.textContent = `${hours}h ago`;
    } else if (minutes > 0) {
        time.textContent = `${minutes}m ago`;
    } else {
        time.textContent = "just now";
    }
    meta.appendChild(time);
    
    content.appendChild(meta);
    item.appendChild(content);
    
    return item;
}

/**
 * Creates a notification section for the sidebar
 */
async function createNotificationSection(parent: HTMLElement, limit: number = 5): Promise<void> {
    const container = document.createElement("div");
    container.className = "notification-section";
    
    const header = document.createElement("div");
    header.className = "notification-header";
    
    const title = document.createElement("span");
    title.className = "notification-title";
    title.textContent = "Notifications";
    header.appendChild(title);
    
    const refreshBtn = document.createElement("button");
    refreshBtn.className = "material-symbols-outlined notification-refresh";
    refreshBtn.textContent = "refresh";
    refreshBtn.addEventListener("click", async () => {
        await updateNotificationSection(container);
    });
    header.appendChild(refreshBtn);
    
    container.appendChild(header);
    
    const list = document.createElement("div");
    list.className = "notification-list";
    container.appendChild(list);
    
    const loading = document.createElement("p");
    loading.className = "notification-loading";
    loading.textContent = "Loading notifications...";
    list.appendChild(loading);
    
    parent.appendChild(container);
    
    // Initial load
    await updateNotificationSection(container);
}

/**
 * Updates the notification section with fresh data
 */
async function updateNotificationSection(container: HTMLElement): Promise<void> {
    const list = container.querySelector(".notification-list");
    if (!list) return;
    
    list.innerHTML = '<p class="notification-loading">Loading notifications...</p>';
    
    try {
        const notifications = await getNotifications(5);
        
        list.innerHTML = "";
        
        if (notifications.length === 0) {
            const empty = document.createElement("p");
            empty.className = "notification-empty";
            empty.textContent = "No new notifications";
            list.appendChild(empty);
            return;
        }
        
        for (const notification of notifications) {
            list.appendChild(createNotificationItem(notification));
        }
        
        // Add "view all" link
        const viewAll = document.createElement("a");
        viewAll.href = isNewReddit() ? "/notifications" : "/message/inbox/";
        viewAll.className = "notification-view-all";
        viewAll.textContent = "View all notifications";
        list.appendChild(viewAll);
        
    } catch (error) {
        console.error("Error updating notifications:", error);
        list.innerHTML = '<p class="notification-error">Error loading notifications</p>';
    }
}

/**
 * Gets the unread notification count and updates the mail icon
 */
async function updateMailIconCount(): Promise<NotificationCount> {
    const count = await getNotificationCount();
    
    // Find the mail icon in the header and update it
    const mailIcon = document.querySelector<HTMLAnchorElement>("#mail");
    if (mailIcon) {
        // Remove old badges
        mailIcon.querySelectorAll(".notification-badge").forEach(el => el.remove());
        
        // Add new badge if there are unread messages
        if (count.total > 0) {
            const badge = createNotificationBadge(count.total, "total");
            mailIcon.appendChild(badge);
            mailIcon.classList.remove("nohavemail");
        } else {
            mailIcon.classList.add("nohavemail");
        }
    }
    
    return count;
}

/**
 * Poll for new notifications periodically
 */
function startNotificationPolling(interval: number = 300000): void {
    // 5 minutes
    setInterval(async () => {
        try {
            await updateMailIconCount();
        } catch (error) {
            console.error("Error polling notifications:", error);
        }
    }, interval);
}

export default class Notifications extends OLFeature {
    moduleName = "Notifications";
    moduleId = "notifications";
    
    private notificationContainer: HTMLElement | null = null;
    private pollingInterval: number = 300000; // 5 minutes
    
    async init() {
        console.log("Initializing Notifications feature");
        
        // Add setting to enable/disable notifications
        this.settingOptions.push(
            new SettingToggle(
                "Enable notifications",
                "Show notifications in sidebar and update mail icon count",
                "notificationsEnabled",
                async (enabled: boolean) => {
                    if (enabled) {
                        await this.setupNotifications();
                        startNotificationPolling(this.pollingInterval);
                    } else {
                        this.cleanupNotifications();
                    }
                }
            )
        );
        
        // Add setting for polling interval
        this.settingOptions.push(
            new SettingSlider(
                "Notification refresh interval",
                "notificationsInterval",
                " minutes",
                5,
                1,
                60,
                (value: number) => {
                    this.pollingInterval = value * 60 * 1000;
                }
            )
        );
        
        // Check if notifications are enabled by default
        const enabled = await store.get("notificationsEnabled");
        if (enabled !== false) {
            await this.setupNotifications();
            startNotificationPolling(this.pollingInterval);
        }
    }
    
    async setupNotifications(): Promise<void> {
        try {
            // Update mail icon count
            await updateMailIconCount();
            
            // Wait for sidebar to be built
            await querySelectorAsync(".user-sidebar");
            
            // Add notification section to user sidebar
            const sidebar = document.querySelector(".user-sidebar");
            if (sidebar) {
                // Check if notification section already exists
                const existingSection = sidebar.querySelector(".notification-section");
                if (!existingSection) {
                    const sectionContainer = document.createElement("div");
                    sidebar.insertBefore(sectionContainer, sidebar.firstChild);
                    await createNotificationSection(sectionContainer);
                    this.notificationContainer = sectionContainer;
                }
            }
        } catch (error) {
            console.error("Error setting up notifications:", error);
        }
    }
    
    cleanupNotifications(): void {
        if (this.notificationContainer) {
            this.notificationContainer.remove();
            this.notificationContainer = null;
        }
    }
}

// Export helper functions for use in other modules
export { 
    getNotificationCount,
    getNotifications,
    isNewReddit,
    isOldReddit,
    updateMailIconCount,
    createNotificationBadge,
    createNotificationItem,
    createNotificationSection,
    updateNotificationSection
};
