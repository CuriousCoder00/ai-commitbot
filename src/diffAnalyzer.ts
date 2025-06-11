import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class DiffAnalyzer {

    async getStagedDiff(repositoryPath: string): Promise<string | null> {
        try {
            // Get staged changes using git diff --cached
            const { stdout: diff } = await execAsync('git diff --cached --no-color', {
                cwd: repositoryPath,
                maxBuffer: 1024 * 1024 * 10 // 10MB buffer
            });

            if (!diff.trim()) {
                return null;
            }

            // Process and clean the diff
            return this.processDiff(diff);

        } catch (error: any) {
            console.error('Error getting staged diff:', error);

            // Fallback: try to get diff using VS Code's Git API
            return await this.getFallbackDiff(repositoryPath);
        }
    }

    private async getFallbackDiff(repositoryPath: string): Promise<string | null> {
        try {
            // Alternative approach using git status and individual file diffs
            const { stdout: status } = await execAsync('git status --porcelain', {
                cwd: repositoryPath
            });

            const stagedFiles = status
                .split('\n')
                .filter(line => line.trim() && (line.startsWith('A ') || line.startsWith('M ') || line.startsWith('D ')))
                .map(line => line.substring(3).trim());

            if (stagedFiles.length === 0) {
                return null;
            }

            // Get diff for staged files
            const diffPromises = stagedFiles.map(async (file) => {
                try {
                    const { stdout } = await execAsync(`git diff --cached --no-color "${file}"`, {
                        cwd: repositoryPath
                    });
                    return stdout;
                } catch {
                    return '';
                }
            });

            const diffs = await Promise.all(diffPromises);
            const combinedDiff = diffs.filter(d => d).join('\n');

            return combinedDiff || null;

        } catch (error) {
            console.error('Fallback diff failed:', error);
            return null;
        }
    }

    private processDiff(diff: string): string {
        // Split diff into lines
        const lines = diff.split('\n');
        const processedLines: string[] = [];

        let currentFile = '';
        let addedLines = 0;
        let removedLines = 0;

        for (const line of lines) {
            // Track file changes
            if (line.startsWith('diff --git')) {
                currentFile = this.extractFilename(line);
                processedLines.push(`\n--- File: ${currentFile} ---`);
                continue;
            }

            // Skip binary files
            if (line.includes('Binary files')) {
                processedLines.push(`Binary file changed: ${currentFile}`);
                continue;
            }

            // Skip index lines (commit hashes)
            if (line.startsWith('index ')) {
                continue;
            }

            // Process meaningful lines
            if (line.startsWith('+++') || line.startsWith('---')) {
                // Skip file path lines, we already have them
                continue;
            } else if (line.startsWith('@@')) {
                // Hunk header - simplify it
                const hunkInfo = this.parseHunkHeader(line);
                processedLines.push(`\n${hunkInfo}`);
            } else if (line.startsWith('+')) {
                // Added line
                addedLines++;
                processedLines.push(line);
            } else if (line.startsWith('-')) {
                // Removed line
                removedLines++;
                processedLines.push(line);
            } else if (line.trim() && !line.startsWith('\\')) {
                // Context line (unchanged)
                processedLines.push(` ${line}`);
            }
        }

        // Add summary at the beginning
        const summary = this.generateSummary(addedLines, removedLines);
        processedLines.unshift(summary);

        return processedLines.join('\n');
    }

    private extractFilename(diffLine: string): string {
        // Extract filename from "diff --git a/file.js b/file.js"
        const match = diffLine.match(/diff --git a\/(.+?) b\//);
        return match ? match[1] : 'unknown';
    }

    private parseHunkHeader(hunkLine: string): string {
        // Parse "@@ -1,4 +1,6 @@ function_name" to something more readable
        const match = hunkLine.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@(.*)/);
        if (match) {
            const [, oldStart, oldCount, newStart, newCount, context] = match;
            const contextInfo = context.trim() ? ` (${context.trim()})` : '';
            return `Changes around line ${newStart}${contextInfo}`;
        }
        return hunkLine;
    }

    private generateSummary(addedLines: number, removedLines: number): string {
        const summary = [];

        if (addedLines > 0) {
            summary.push(`+${addedLines} additions`);
        }
        if (removedLines > 0) {
            summary.push(`-${removedLines} deletions`);
        }

        return `Summary: ${summary.join(', ')}\n`;
    }

    // Get a more concise version of the diff for AI processing
    async getConciseDiff(repositoryPath: string): Promise<string | null> {
        try {
            const fullDiff = await this.getStagedDiff(repositoryPath);
            if (!fullDiff) {
                return null;
            }

            // Get just the file changes summary
            const { stdout: statOutput } = await execAsync('git diff --cached --stat', {
                cwd: repositoryPath
            });

            // Get list of changed files with their change types
            const { stdout: nameStatus } = await execAsync('git diff --cached --name-status', {
                cwd: repositoryPath
            });

            const fileChanges = nameStatus
                .split('\n')
                .filter(line => line.trim())
                .map(line => {
                    const [status, filename] = line.split('\t');
                    const changeType = {
                        'A': 'Added',
                        'M': 'Modified',
                        'D': 'Deleted',
                        'R': 'Renamed',
                        'C': 'Copied'
                    }[status] || 'Changed';
                    return `${changeType}: ${filename}`;
                });

            // Combine concise info
            const conciseInfo = [
                'File Changes:',
                ...fileChanges,
                '\nStats:',
                statOutput.trim(),
                '\nKey Changes:',
                this.extractKeyChanges(fullDiff)
            ].join('\n');

            return conciseInfo;

        } catch (error) {
            // Fallback to full diff if concise version fails
            return await this.getStagedDiff(repositoryPath);
        }
    }

    private extractKeyChanges(diff: string): string {
        const lines = diff.split('\n');
        const keyChanges: string[] = [];

        for (const line of lines) {
            // Look for important patterns
            if (line.startsWith('+') && (
                line.includes('function') ||
                line.includes('class') ||
                line.includes('const') ||
                line.includes('let') ||
                line.includes('var') ||
                line.includes('import') ||
                line.includes('export') ||
                line.includes('//') ||
                line.includes('/*')
            )) {
                keyChanges.push(line);
            }
        }

        return keyChanges.slice(0, 10).join('\n'); // Limit to top 10 key changes
    }
}