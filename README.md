# Simple ChatGPT Sidebar

A Chrome extension that provides quick access to ChatGPT in a convenient sidebar panel. Select text and ask ChatGPT about it, or reference entire pages with customizable prompts.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)
![Version](https://img.shields.io/badge/version-1.3.0-blue)

## Features

- **Sidebar Access** — Open ChatGPT in a side panel without leaving your current page
- **Text Selection Prompts** — Right-click selected text and choose from pre-built actions:
  - Explain this
  - Summarize
  - Translate to English
  - Fix grammar
  - Explain code
  - Find bugs
- **Page Prompts** — Right-click anywhere on a page to:
  - Summarize this page
  - Explain this page
  - Ask questions about the page
  - Send page URL to ChatGPT
  - Custom prompt with page context
- **Customizable Prompts** — Add, edit, reorder, or disable prompts in settings
- **Keyboard Shortcuts**:
  - `Ctrl+Shift+G` (or `Cmd+Shift+G` on Mac) — Toggle sidebar
  - `Alt+G` — Send selected text directly to ChatGPT
- **Auto-Submit** — Optionally auto-send prompts to ChatGPT without pressing Enter
- **Temporary Chat Startup** — Optionally open the sidebar in Temporary Chat mode
- **Prompt Shortcuts** — Map three keyboard shortcuts to your text-selection prompts; use selected text or the focused text field
- **Visual Feedback** — Green flash confirms text was pasted into ChatGPT

## Installation

### From Source (Developer Mode)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **Load unpacked**
5. Select the extension folder

### Building from Source

No build step required — this extension uses vanilla JavaScript and can be loaded directly.

## Usage

### Opening the Sidebar
- Click the extension icon in your toolbar
- Or press `Ctrl+Shift+G` (`Cmd+Shift+G` on Mac)

### Asking About Selected Text
1. Select any text on a webpage
2. Right-click to open context menu
3. Navigate to **Ask ChatGPT** submenu
4. Choose a prompt or select **Just send to ChatGPT**

### Asking About a Page
1. Right-click anywhere on the page (not on text)
2. Navigate to **Ask ChatGPT about this page** submenu
3. Choose a prompt or select **Custom prompt...** to enter your own

### Customizing Prompts
1. Right-click → **Ask ChatGPT about this page** → **Settings...**
2. Or go to Chrome extensions page and click **Options** for this extension
3. Add, edit, reorder, enable/disable prompts as needed

### Opening in Temporary Chat
1. Open the extension's **Options** page.
2. Enable **Open in Temporary Chat** under General Settings.
3. Reopen the sidebar. Verify ChatGPT shows the **Temporary** indicator before sending.

This controls the initial sidebar URL only. ChatGPT's internal New Chat button may switch back to standard mode.

### Keyboard shortcuts for prompts
1. Open **Options → Prompt Shortcuts** and choose a text prompt for each shortcut slot.
2. Use **Ctrl+Shift+1 / 2 / 3** (macOS: **Control+Shift+1 / 2 / 3**) while viewing a normal webpage.
3. To change the key combinations or resolve collisions, open `chrome://extensions/shortcuts` and configure the three **Send text** shortcuts for this extension.
4. Highlight text (including just part of an input, textarea, or editable field), then press the assigned shortcut. If the focused field has no selection, the entire field is used. Ordinary webpage text must be selected.

The shortcut opens the sidebar and fills ChatGPT's input with the configured prompt. Enable the existing **Auto-submit prompts** setting if you also want to send it immediately without pressing Enter. The shortcut doesn't overwrite the system clipboard or select/modify webpage text. Password fields are excluded. Shortcuts don't work on restricted Chrome pages or in every embedded editor.

## Template Variables

When creating custom prompts, you can use these placeholders:

| Variable | Description | Available In |
|----------|-------------|--------------|
| `{text}` | The selected text | Text selection prompts |
| `{title}` | Page title | Page prompts |
| `{url}` | Page URL | Page prompts |

## Project Structure

```
├── manifest.json          # Extension configuration
├── background.js          # Service worker (context menus, messaging)
├── sidepanel.html/js      # Sidebar panel UI
├── content.js             # Content script for all pages
├── chatgpt-inject.js      # Script injected into ChatGPT
├── options.html/js/css    # Settings page
├── prompt-input.html/js   # Custom prompt popup
├── styles.css             # Sidebar styles
├── rules.json             # Declarative net request rules
└── icons/                 # Extension icons
```

## Permissions

| Permission | Purpose |
|------------|---------|
| `sidePanel` | Open ChatGPT in sidebar |
| `contextMenus` | Right-click menu integration |
| `storage` | Save user preferences and prompts |
| `activeTab` | Access current tab info for page prompts |
| `declarativeNetRequest` | Handle iframe embedding requirements |
| `clipboardWrite` | Copy text to clipboard when needed |

## Privacy

- This extension does not collect or transmit any user data
- All settings and custom prompts are stored locally in Chrome
- The extension only communicates with `chatgpt.com` through the embedded iframe

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built for the ChatGPT interface at [chatgpt.com](https://chatgpt.com)
- Icons designed for Chrome extension guidelines

