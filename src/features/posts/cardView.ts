import { OLFeature, SettingToggle } from "../base";
import { store } from "../../extensionPreferences";

const cardViewKey = "cardViewEnabled";

export default class CardView extends OLFeature {
    moduleName = "Card View";
    moduleId = "cardView";
    
    async init() {
        // Add setting toggle
        this.settingOptions.push(
            new SettingToggle(
                "Enable Card View",
                "Display posts as cards with modern styling. Works best on old Reddit.",
                cardViewKey,
                (enabled) => {
                    this.toggleCardView(enabled);
                }
            )
        );
        
        // Check if card view should be enabled by default
        const isEnabled = await this.getDefaultCardViewState();
        if (isEnabled) {
            this.toggleCardView(true);
        }
    }
    
    async getDefaultCardViewState(): Promise<boolean> {
        // Check if setting exists, if not, enable by default
        const storedValue = await store.get(cardViewKey);
        return storedValue !== undefined ? storedValue : true;
    }
    
    toggleCardView(enabled: boolean) {
        if (enabled) {
            document.body.classList.add("ol-card-view");
        } else {
            document.body.classList.remove("ol-card-view");
        }
    }
    
    async onPost(post: HTMLDivElement) {
        if (!post.classList.contains("link")) {
            return;
        }
        
        // Apply card container class to all link posts for CSS targeting
        post.classList.add("ol-card-container");
        
        // Ensure post has the ol-post-container structure
        if (!post.querySelector(".ol-post-container")) {
            const postContainer = document.createElement("div");
            postContainer.className = "ol-post-container";
            
            // Move all children except midcol into container
            const childrenToMove = Array.from(post.children).filter(
                child => !child.classList.contains("midcol")
            );
            postContainer.append(...childrenToMove);
            post.appendChild(postContainer);
        }
        
        // Add card-specific classes to elements
        const postContainer = post.querySelector(".ol-post-container");
        if (postContainer) {
            postContainer.classList.add("ol-card-content");
        }
        
        const thumbnail = post.querySelector(".thumbnail");
        if (thumbnail) {
            thumbnail.classList.add("ol-card-thumbnail");
        }
        
        const entry = post.querySelector(".entry");
        if (entry) {
            entry.classList.add("ol-card-entry");
        }
        
        const buttons = post.querySelector(".flat-list.buttons");
        if (buttons) {
            buttons.classList.add("ol-card-buttons");
        }
    }
}