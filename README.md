# AI Auto Commit - VS Code Extension

Generate intelligent commit messages using Google's Gemini AI with just one click!

## Features

- 🤖 **AI-Powered Commit Messages**: Uses Google Gemini AI to analyze your staged changes and generate meaningful commit messages
- ⚡ **One-Click Operation**: Generate and commit with a single click
- 🎯 **Multiple Commit Styles**: Choose between conventional commits, descriptive, or concise styles
- 🔧 **Highly Configurable**: Customize behavior through VS Code settings
- 🎨 **Great UX**: Status bar integration and command palette support
- 🔒 **Secure**: API keys stored securely in VS Code settings

## Installation

1. Install the extension from VS Code Marketplace
2. Get a free Gemini AI API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
3. Configure the API key using the command `AI Auto Commit: Configure Gemini API Key`

## Usage

### Quick Start
1. Make your code changes
2. Stage the changes using Git (`git add` or VS Code's Source Control)
3. Click the "🤖 AI Commit" button in the status bar, OR
4. Use Command Palette (`Ctrl+Shift+P`) → "Generate AI Commit"

### Command Palette Commands
- `AI Auto Commit: Generate AI Commit` - Generate commit message for staged changes
- `AI Auto Commit: Configure Gemini API Key` - Set up your Gemini API key

## Configuration

Access settings via File → Preferences → Settings → Search "AI Auto Commit"

### Available Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `aiAutoCommit.geminiApiKey` | Your Gemini AI API key | (empty) |
| `aiAutoCommit.commitStyle` | Commit message style preference | "conventional" |
| `aiAutoCommit.maxDiffSize` | Maximum diff size to send to AI (characters) | 5000 |
| `aiAutoCommit.autoCommit` | Auto-commit without confirmation |