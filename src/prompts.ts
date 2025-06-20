import * as fs from 'fs';
import * as path from 'path';

export type CommitStyle = 'conventional' | 'descriptive' | 'concise' | 'semantic' | 'gitmoji';

export class PromptsService {
    private promptsCache: Map<CommitStyle, string> = new Map();
    private readonly promptsDir: string;

    constructor() {
        // Get the prompts directory path relative to the extension root
        this.promptsDir = path.join(__dirname, '..', 'prompts');
    }

    /**
     * Get prompt template for a specific commit style
     * @param style The commit message style
     * @returns The prompt template string
     */
    getPrompt(style: CommitStyle): string {
        // Check cache first
        if (this.promptsCache.has(style)) {
            return this.promptsCache.get(style)!;
        }

        try {
            const promptPath = path.join(this.promptsDir, `${style}.txt`);
            
            // Check if file exists
            if (!fs.existsSync(promptPath)) {
                throw new Error(`Prompt file not found: ${style}.txt`);
            }

            // Read the prompt file
            const promptContent = fs.readFileSync(promptPath, 'utf-8');
            
            // Cache the prompt for future use
            this.promptsCache.set(style, promptContent);
            
            return promptContent;
        } catch (error) {
            console.error(`Error reading prompt file for style '${style}':`, error);
            
            // Return fallback prompt
            return this.getFallbackPrompt(style);
        }
    }

    /**
     * Build complete prompt with diff and custom instructions
     * @param diff Git diff content
     * @param style Commit message style
     * @param customInstructions Additional custom instructions
     * @returns Complete prompt ready for AI
     */
    buildPrompt(diff: string, style: CommitStyle, customInstructions: string = ''): string {
        const promptTemplate = this.getPrompt(style);
        
        const basePrompt = `You are an expert software developer analyzing a git diff to generate the perfect commit message.

Context: Analyze the code changes and understand the intent, impact, and scope of modifications.

Git diff:
\`\`\`diff
${diff}
\`\`\`

${customInstructions ? `Additional Instructions: ${customInstructions}\n` : ''}`;

        // Replace placeholders in the template if any
        const completePrompt = basePrompt + '\n' + promptTemplate;
        
        return completePrompt;
    }

    /**
     * Get all available commit styles
     * @returns Array of available commit styles
     */
    getAvailableStyles(): CommitStyle[] {
        try {
            const files = fs.readdirSync(this.promptsDir);
            const styles = files
                .filter(file => file.endsWith('.txt'))
                .map(file => file.replace('.txt', '') as CommitStyle)
                .filter(style => this.isValidStyle(style));
            
            return styles;
        } catch (error) {
            console.error('Error reading prompts directory:', error);
            return ['conventional', 'descriptive', 'concise']; // Default styles
        }
    }

    /**
     * Reload prompts from files (clears cache)
     */
    reloadPrompts(): void {
        this.promptsCache.clear();
    }

    /**
     * Check if a style is valid
     * @param style Style to check
     * @returns Whether the style is valid
     */
    private isValidStyle(style: string): style is CommitStyle {
        return ['conventional', 'descriptive', 'concise', 'semantic', 'gitmoji'].includes(style);
    }

    /**
     * Get fallback prompt when file reading fails
     * @param style Commit style
     * @returns Fallback prompt
     */
    private getFallbackPrompt(style: CommitStyle): string {
        const fallbacks: Record<CommitStyle, string> = {
            conventional: `Requirements:
- STRICT conventional commit format: type(scope): description
- Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build
- Keep description under 50 characters
- Use imperative mood (e.g., "add", "fix", "update")
- Don't end with a period
- Example: "feat(auth): add JWT token validation"

CRITICAL: Generate ONLY the commit message. No explanations, quotes, prefixes, or additional text.`,

            descriptive: `Requirements:
- Generate a detailed commit message with summary and bullet points
- Format:
  * First line: Clear summary (50-72 chars, imperative mood, no period)
  * Empty line
  * Bullet points describing key changes (use - for bullets)
- Summary should start with imperative verb (Add, Fix, Update, Remove, etc.)
- Bullet points should explain specific changes, functionality, and technical details

CRITICAL: Generate ONLY the commit message. No explanations, quotes, prefixes, or additional text.`,

            concise: `Requirements:
- Ultra-concise message capturing the essence
- Maximum 40 characters
- Imperative mood
- Focus on the primary change
- Examples: "Fix login bug", "Add dark mode", "Update deps"

CRITICAL: Generate ONLY the commit message. No explanations, quotes, prefixes, or additional text.`,

            semantic: `Requirements:
- Semantic commit format with emoji: emoji type(scope): description
- Emoji types: ✨ feat, 🐛 fix, 📚 docs, 💄 style, ♻️ refactor, 🧪 test, 🔧 chore, ⚡ perf, 👷 ci, 📦 build
- Example: "✨ feat(auth): implement OAuth2 login"

CRITICAL: Generate ONLY the commit message. No explanations, quotes, prefixes, or additional text.`,

            gitmoji: `Requirements:
- Gitmoji format: :emoji: description
- Common gitmojis: :sparkles: features, :bug: fixes, :memo: docs, :lipstick: UI, :recycle: refactor
- Example: ":sparkles: Add user authentication system"

CRITICAL: Generate ONLY the commit message. No explanations, quotes, prefixes, or additional text.`
        };

        return fallbacks[style];
    }

    /**
     * Validate prompt file content
     * @param style Commit style
     * @returns Whether the prompt file is valid
     */
    validatePromptFile(style: CommitStyle): boolean {
        try {
            const prompt = this.getPrompt(style);
            
            // Basic validation - check if prompt has required sections
            const hasRequirements = prompt.toLowerCase().includes('requirements');
            const hasGenerate = prompt.toLowerCase().includes('generate');
            
            return hasRequirements || hasGenerate;
        } catch {
            return false;
        }
    }
}

// Export singleton instance
export const promptsService = new PromptsService();