import { GoogleGenerativeAI } from '@google/generative-ai';
import * as vscode from 'vscode';

export class GeminiService {
    private genAI: GoogleGenerativeAI | null = null;

    private initializeAI(apiKey: string) {
        if (!this.genAI) {
            this.genAI = new GoogleGenerativeAI(apiKey);
        }
    }

    async generateCommitMessage(diff: string, config: vscode.WorkspaceConfiguration): Promise<string | null> {
        try {
            const apiKey = config.get<string>('geminiApiKey');
            if (!apiKey) {
                throw new Error('Gemini API key not configured');
            }

            this.initializeAI(apiKey);
            const model = this.genAI!.getGenerativeModel({ model: 'gemini-2.0-flash' });

            const commitStyle = config.get<string>('commitStyle', 'conventional');
            const maxDiffSize = config.get<number>('maxDiffSize', 5000);

            // Truncate diff if too large
            const truncatedDiff = diff.length > maxDiffSize 
                ? diff.substring(0, maxDiffSize) + '\n... (truncated)'
                : diff;

            const prompt = this.buildPrompt(truncatedDiff, commitStyle);

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const commitMessage = response.text().trim();

            // Clean up the response (remove quotes, extra formatting)
            return this.cleanCommitMessage(commitMessage);

        } catch (error: any) {
            console.error('Gemini API error:', error);
            
            // Handle specific API errors
            if (error.message?.includes('API_KEY_INVALID')) {
                throw new Error('Invalid Gemini API key. Please check your configuration.');
            } else if (error.message?.includes('QUOTA_EXCEEDED')) {
                throw new Error('Gemini API quota exceeded. Please try again later.');
            } else if (error.message?.includes('SAFETY')) {
                throw new Error('Content filtered by safety settings. Try with different changes.');
            } else {
                throw new Error(`Gemini API error: ${error.message}`);
            }
        }
    }

    private buildPrompt(diff: string, commitStyle: string): string {
        const basePrompt = `You are an expert software developer. Analyze the following git diff and generate a concise, meaningful commit message.

Git diff:
\`\`\`diff
${diff}
\`\`\`

Requirements:`;

        let styleInstructions = '';
        
        switch (commitStyle) {
            case 'conventional':
                styleInstructions = `
- Use conventional commit format: type(scope): description
- Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build
- Keep description under 50 characters
- Use imperative mood (e.g., "add", "fix", "update")
- Don't end with a period
- Example: "feat(auth): add JWT token validation"`;
                break;
            
            case 'descriptive':
                styleInstructions = `
- Write a clear, descriptive commit message
- Use imperative mood (e.g., "Add", "Fix", "Update")
- Keep it under 72 characters
- Focus on what the change accomplishes
- Example: "Add user authentication with JWT tokens"`;
                break;
            
            case 'concise':
                styleInstructions = `
- Write a very concise commit message
- Maximum 40 characters
- Use imperative mood
- Focus on the main change
- Example: "Fix login bug"`;
                break;
        }

        return basePrompt + styleInstructions + `

Generate ONLY the commit message, nothing else. Do not include explanations, quotes, or additional text.`;
    }

    private cleanCommitMessage(message: string): string {
        // Remove common unwanted formatting
        let cleaned = message
            .replace(/^["']|["']$/g, '') // Remove surrounding quotes
            .replace(/^\s*-\s*/, '') // Remove leading dash
            .replace(/^commit:\s*/i, '') // Remove "commit:" prefix
            .replace(/^message:\s*/i, '') // Remove "message:" prefix
            .trim();

        // Take only the first line if multiple lines
        cleaned = cleaned.split('\n')[0];

        // Ensure it doesn't end with a period for conventional commits
        if (cleaned.endsWith('.') && cleaned.length < 100) {
            cleaned = cleaned.slice(0, -1);
        }

        return cleaned;
    }

    // Test connection to Gemini API
    async testConnection(apiKey: string): Promise<boolean> {
        try {
            this.initializeAI(apiKey);
            const model = this.genAI!.getGenerativeModel({ model: 'gemini-pro' });
            
            const result = await model.generateContent('Hello, can you respond with just "OK"?');
            const response = await result.response;
            
            return response.text().trim().toLowerCase().includes('ok');
        } catch (error) {
            return false;
        }
    }
}