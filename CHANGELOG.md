# Change Log

All notable changes to the "ai-auto-commit" extension will be documented in this file.

[1.1.0] - 2025-06-20
### Added
- New Commit Styles: Added semantic (with emojis) and gitmoji styles
- Change Analysis: Analyze the type and impact of changes for better commit messages
- Contextual Commits: Consider branch name and recent commits for better consistency
- API Connection Testing: New command to test API connectivity
- Prompt Reloading: Development feature for prompt reloading
- Walkthrough: Added guided walkthrough for new users
- Enhanced Metadata: Added gallery banner, better descriptions, and more keywords

### Enhanced
- Prompt Engineering: More detailed and specific prompts for each commit style
- Error Handling: More specific error messages and fallback mechanisms
- Configuration Options: Expanded customization through VS Code settings
- User Experience: Better menu locations and command visibility
- Activation: Changed to onStartupFinished for improved performance
- Command Icons: Added icons to all commands for better visual identification

### Configuration

- New Settings:
 - excludeFiles: Specify files to ignore in diff analysis
 - includeContext: Enable branch/commit context usage
 - temperature: Control AI creativity level
 - showNotifications: Toggle extension notifications


- Improved Descriptions: More detailed configuration descriptions and enum explanations
- Ordered Options: Better organization of configuration settings

## Fixed
- Performance: Better activation conditions for git repositories
- Context Awareness: Improved when conditions for commands
- Generation Consistency: Lower temperature settings for more consistent results

## [1.0.2] - 2025-06-11

### Added
- Multiple commit styles (conventional, descriptive, concise)
- Status bar integration
- Configurable settings
- Git staged changes analysis
- Secure API key storage

### Features
- Support for conventional commit format
- Customizable diff size limits
- Auto-commit option
- Command palette integration
- Error handling and user feedback

## [1.0.0] - 2025-06-10

### Added
- Initial release
- AI-powered commit message generation using Gemini AI
- One-click commit functionality

### Features
- Generate intelligent commit messages from git diffs