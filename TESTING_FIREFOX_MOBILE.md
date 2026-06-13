# Firefox Mobile Testing Guide for Card View

## Overview

This guide provides instructions for testing the new Card View feature on Firefox Mobile. The Card View feature is inspired by Sync For Reddit's layout and provides a modern, mobile-friendly post display.

## Prerequisites

1. **Firefox Mobile** - Install the latest version from the app store
2. **Old Reddit** - Ensure you're using `old.reddit.com` (not new Reddit)
3. **Build Tools** - Node.js and Yarn for building the extension

## Building the Extension

### 1. Install Dependencies

```bash
cd /workspace/hesitancy2781__Recurs
npm install
```

### 2. Build for Firefox Mobile

```bash
# Build with Firefox-specific settings
npm run wp-build-ff

# Or build in production mode
npm run wp-build-ff -- --mode=production
```

### 3. Package for Firefox

```bash
npm run package:firefox
```

This will create a `.xpi` file in the `dist` directory that can be sideloaded onto Firefox Mobile.

## Sideloading on Firefox Mobile

### Method 1: Using Firefox Nightly (Recommended)

1. Install **Firefox Nightly** from the Play Store
2. Go to `about:config` and enable:
   - `extensions.experiments.enabled` = true
   - `extensions.webextensions.sideloading.enabled` = true
3. Connect your device to your computer via USB
4. Push the `.xpi` file to your device:
   ```bash
   adb push dist/oldlander.xpi /sdcard/Download/
   ```
5. On your device, open Firefox Nightly and go to `about:debugging`
6. Tap "Load Temporary Add-on" and select the `.xpi` file

### Method 2: Using Firefox Release with ADB

1. Enable USB debugging on your Android device
2. Connect via USB and run:
   ```bash
   adb install dist/oldlander.xpi
   ```

### Method 3: Using Kiwi Browser (Alternative)

1. Install **Kiwi Browser** from the Play Store
2. Go to `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist` folder

## Testing the Card View Feature

### 1. Enable Card View

1. Open Firefox Mobile and navigate to `old.reddit.com`
2. Access OldLander settings by adding `#olPreferences` to the URL:
   - Go to any subreddit page
   - Add `#olPreferences` to the end of the URL and press Enter
3. Look for the "Card View" section
4. Toggle "Enable Card View" to ON
5. Refresh the page to see the card layout

### 2. Verify Card View Functionality

#### Visual Checks:
- [ ] Posts should appear as cards with rounded corners
- [ ] Each card should have a subtle shadow and border
- [ ] Thumbnails should be square (70x70px) and positioned on the left
- [ ] Post title should be bold and clearly readable
- [ ] Subreddit name should be prominent
- [ ] Action buttons (upvote, downvote, save, etc.) should be at the bottom
- [ ] Buttons should have icons and text labels

#### Layout Checks:
- [ ] Cards should be properly spaced with margins between them
- [ ] Text should not overflow from cards
- [ ] Long titles should wrap properly
- [ ] Self posts (text posts) should display the text content properly
- [ ] Link posts should show the thumbnail and title

#### Touch Interaction:
- [ ] Tapping on a card should open the post
- [ ] Tapping on action buttons should work (upvote, downvote, etc.)
- [ ] Buttons should have visual feedback when pressed
- [ ] Scrolling should be smooth

#### Performance:
- [ ] Page loading should be fast
- [ ] Scrolling should be smooth (60fps)
- [ ] No layout shifts when cards load
- [ ] Memory usage should be reasonable

### 3. Toggle Card View Off/On

1. Go back to settings (`#olPreferences`)
2. Toggle "Enable Card View" to OFF
3. Refresh the page - posts should return to the original layout
4. Toggle it back ON and refresh - cards should reappear

### 4. Test Different Post Types

- [ ] **Link posts** - Should show thumbnail, title, subreddit, and buttons
- [ ] **Self posts** - Should show title, text content, subreddit, and buttons
- [ ] **Image posts** - Should show thumbnail, title, subreddit, and buttons
- [ ] **Video posts** - Should show thumbnail, title, subreddit, and buttons
- [ ] **Crossposts** - Should show thumbnail, title, subreddit, and buttons
- [ ] **Stickied posts** - Should be clearly distinguishable

### 5. Test with RES (Reddit Enhancement Suite)

If you have RES installed:
- [ ] Card view should work alongside RES features
- [ ] Infinite scrolling should work with card view
- [ ] RES buttons should be properly positioned
- [ ] No visual conflicts between RES and card view

## Troubleshooting

### Card View Not Appearing

1. **Check URL**: Ensure you're on `old.reddit.com`, not `www.reddit.com`
2. **Check Settings**: Verify that "Enable Card View" is toggled ON
3. **Clear Cache**: Clear Firefox Mobile cache and reload
4. **Check Console**: Open `about:debugging` > "Inspect" to see if there are JavaScript errors

### Layout Issues

1. **Overlapping Elements**: Check if the issue is specific to certain post types
2. **Missing Thumbnails**: Some posts may not have thumbnails - this is normal
3. **Text Overflow**: Long titles or text should wrap properly

### Performance Issues

1. **Slow Loading**: Try disabling other extensions to isolate the issue
2. **Scrolling Lag**: Check if the issue persists in safe mode
3. **Memory Usage**: Monitor memory usage in `about:debugging`

## Known Limitations

1. **New Reddit**: Card View only works on old.reddit.com
2. **Some Subreddits**: Custom subreddit CSS might interfere with card layout
3. **Legacy Posts**: Very old posts might not display perfectly
4. **Mobile Limitations**: Firefox Mobile has some CSS limitations compared to desktop

## Reporting Issues

When reporting issues, please include:
- Firefox Mobile version
- Android version
- Device model
- Steps to reproduce
- Screenshots (if possible)
- Console errors (from `about:debugging`)

## Development Notes

### Card View Implementation Details

- **CSS Classes**: Card view uses `.ol-card-view` on body and `.ol-card-container` on posts
- **Responsive**: Adapts to different screen sizes with media queries
- **Touch Optimized**: Larger touch targets and visual feedback
- **Performance**: Uses efficient CSS selectors and minimal JavaScript

### Firefox Mobile Specifics

- Uses `-moz-appearance: none` for consistent button styling
- Touch targets are at least 36x36px for finger-friendly interaction
- Prevents text selection on buttons to avoid accidental selections
- Includes active state animations for touch feedback

### Compatibility

- **Old Reddit**: Full support
- **RES**: Compatible with most RES features
- **Dark Mode**: Works with both light and dark themes
- **System Theme**: Respects system theme preferences