import { GoogleGenerativeAI } from '@google/generative-ai';
import * as vscode from 'vscode';
import { promptsService, CommitStyle } from './prompts';

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
            const model = this.genAI!.getGenerativeModel({ 
                model: 'gemini-2.0-flash',
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 200, // Increased for descriptive commits
                }
            });

            const commitStyle = config.get<string>('commitStyle', 'conventional') as CommitStyle;
            const maxDiffSize = config.get<number>('maxDiffSize', 5000);
            const customInstructions = config.get<string>('customInstructions', '');

            // Truncate diff if too large
            const truncatedDiff = diff.length > maxDiffSize 
                ? diff.substring(0, maxDiffSize) + '\n... (truncated)'
                : diff;

            // Use the prompts service to build the complete prompt
            const prompt = promptsService.buildPrompt(truncatedDiff, commitStyle, customInstructions);

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const commitMessage = response.text().trim();

            // Clean up the response
            return this.cleanCommitMessage(commitMessage, commitStyle);

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

    private cleanCommitMessage(message: string, style: CommitStyle): string {
        let cleaned = message
            .replace(/^["'`]|["'`]$/g, '') // Remove quotes/backticks
            .replace(/^(commit|message):\s*/i, '') // Remove prefixes
            .replace(/^git\s+commit\s+-m\s*/i, '') // Remove git command
            .trim();

        // Handle different styles differently
        switch (style) {
            case 'descriptive':
                // For descriptive commits, preserve multi-line format
                if (cleaned.includes('\n') && cleaned.includes('-')) {
                    const lines = cleaned.split('\n');
                    const summary = lines[0].trim();
                    
                    // Clean summary line
                    const cleanSummary = summary
                        .replace(/^\s*[-*]\s*/, '') // Remove leading bullet from summary
                        .replace(/\.$/, ''); // Remove trailing period
                    
                    // Keep the rest of the message intact
                    const rest = lines.slice(1).join('\n');
                    return cleanSummary + '\n' + rest;
                }
                break;
                
            case 'conventional':
            case 'semantic':
            case 'gitmoji':
                // For these styles, typically single line
                cleaned = cleaned.split('\n')[0];
                break;
                
            case 'concise':
                // Ultra-short, single line
                cleaned = cleaned.split('\n')[0];
                break;
        }

        // General cleanup for single-line commits
        if (!cleaned.includes('\n')) {
            cleaned = cleaned.replace(/^\s*[-*]\s*/, ''); // Remove leading bullets
            
            // Remove trailing period for short messages
            if (cleaned.endsWith('.') && cleaned.length < 80) {
                cleaned = cleaned.slice(0, -1);
            }
        }

        return cleaned;
    }

    // Get available commit styles from prompts service
    getAvailableStyles(): CommitStyle[] {
        return promptsService.getAvailableStyles();
    }

    // Reload prompts (useful for development/testing)
    reloadPrompts(): void {
        promptsService.reloadPrompts();
    }

    async testConnection(apiKey: string): Promise<boolean> {
        try {
            this.initializeAI(apiKey);
            const model = this.genAI!.getGenerativeModel({ model: 'gemini-2.0-flash' });
            
            const result = await model.generateContent('Respond with exactly: "CONNECTION_OK"');
            const response = await result.response;
            
            return response.text().trim() === 'CONNECTION_OK';
        } catch (error) {
            return false;
        }
    }
}