import * as vscode from 'vscode';
import { GitExtension, Repository } from './git';
import { GeminiService } from './geminiService';
import { DiffAnalyzer } from './diffAnalyzer';

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    console.log('AI Auto Commit extension is now active');

    // Initialize services
    const geminiService = new GeminiService();
    const diffAnalyzer = new DiffAnalyzer();

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.text = "$(git-commit) AI Commit";
    statusBarItem.command = 'aiAutoCommit.generateCommit';
    statusBarItem.tooltip = 'Generate AI-powered commit message';
    statusBarItem.show();

    // Register commands
    const generateCommitCommand = vscode.commands.registerCommand('aiAutoCommit.generateCommit', async () => {
        await generateCommit(geminiService, diffAnalyzer);
    });

    const configureApiKeyCommand = vscode.commands.registerCommand('aiAutoCommit.configureApiKey', async () => {
        await configureApiKey(geminiService);
    });

    const openSettingsCommand = vscode.commands.registerCommand('aiAutoCommit.openSettings', async () => {
        await vscode.commands.executeCommand('workbench.action.openSettings', 'aiAutoCommit');
    });

    const reloadPromptsCommand = vscode.commands.registerCommand('aiAutoCommit.reloadPrompts', async () => {
        geminiService.reloadPrompts();
        vscode.window.showInformationMessage('Prompts reloaded successfully!');
    });

    // Add test connection command (even though not in package.json, it's referenced in menus)
    const testConnectionCommand = vscode.commands.registerCommand('aiAutoCommit.testConnection', async () => {
        await testConnection(geminiService);
    });

    context.subscriptions.push(
        generateCommitCommand,
        configureApiKeyCommand,
        openSettingsCommand,
        reloadPromptsCommand,
        testConnectionCommand,
        statusBarItem
    );
}

async function generateCommit(geminiService: GeminiService, diffAnalyzer: DiffAnalyzer) {
    try {
        // Check if Gemini API key is configured
        const config = vscode.workspace.getConfiguration('aiAutoCommit');
        const apiKey = config.get<string>('geminiApiKey');

        if (!apiKey) {
            const result = await vscode.window.showWarningMessage(
                'Gemini API key not configured. Configure now?',
                'Configure', 'Cancel'
            );
            if (result === 'Configure') {
                await configureApiKey(geminiService);
                return;
            }
            return;
        }

        // Get Git repository
        const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports;
        if (!gitExtension) {
            vscode.window.showErrorMessage('Git extension not found');
            return;
        }

        const git = gitExtension.getAPI(1);
        if (git.repositories.length === 0) {
            vscode.window.showErrorMessage('No Git repository found in workspace');
            return;
        }

        const repo = git.repositories[0];

        // Check for staged changes
        if (repo.state.indexChanges.length === 0) {
            vscode.window.showWarningMessage('No staged changes found. Stage some changes first.');
            return;
        }

        // Show progress
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Generating AI commit message...',
            cancellable: false
        }, async (progress) => {
            try {
                // Get diff of staged changes
                progress.report({ increment: 20, message: 'Analyzing staged changes...' });
                const diff = await diffAnalyzer.getStagedDiff(repo.rootUri.fsPath);

                if (!diff) {
                    vscode.window.showErrorMessage('Unable to get staged changes');
                    return;
                }

                // Generate commit message using Gemini
                progress.report({ increment: 40, message: 'Generating commit message...' });
                const commitMessage = await geminiService.generateCommitMessage(diff, config);

                if (!commitMessage) {
                    vscode.window.showErrorMessage('Failed to generate commit message');
                    return;
                }

                progress.report({ increment: 30, message: 'Applying commit message...' });

                // Check if auto-commit is enabled
                const autoCommit = config.get<boolean>('autoCommit', false);

                if (autoCommit) {
                    // Auto commit
                    await repo.commit(commitMessage);
                    vscode.window.showInformationMessage(`Auto-committed: ${commitMessage}`);
                } else {
                    // Set commit message and let user review/commit manually
                    repo.inputBox.value = commitMessage;
                    const result = await vscode.window.showInformationMessage(
                        `Generated commit message: "${commitMessage}"`,
                        'Commit Now', 'Edit Message', 'Cancel'
                    );

                    if (result === 'Commit Now') {
                        await repo.commit(commitMessage);
                        vscode.window.showInformationMessage('Successfully committed!');
                    } else if (result === 'Edit Message') {
                        // Focus on SCM input box for editing
                        vscode.commands.executeCommand('workbench.view.scm');
                    }
                }

                progress.report({ increment: 10, message: 'Complete!' });
            } catch (error: any) {
                vscode.window.showErrorMessage(`Error: ${error.message}`);
            }
        });

    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to generate commit: ${error.message}`);
    }
}

async function configureApiKey(geminiService: GeminiService) {
    const apiKey = await vscode.window.showInputBox({
        prompt: 'Enter your Gemini AI API key',
        password: true,
        placeHolder: 'Your Gemini API key...',
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return 'API key cannot be empty';
            }
            if (value.length < 10) {
                return 'API key seems too short';
            }
            return null;
        }
    });

    if (apiKey) {
        // Test the API key before saving
        const isValid = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Testing API connection...',
            cancellable: false
        }, async () => {
            return await geminiService.testConnection(apiKey.trim());
        });

        if (isValid) {
            const config = vscode.workspace.getConfiguration('aiAutoCommit');
            await config.update('geminiApiKey', apiKey.trim(), vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage('Gemini API key configured and tested successfully!');
        } else {
            vscode.window.showErrorMessage('Invalid API key or connection failed. Please check your key and try again.');
        }
    }
}

async function testConnection(geminiService: GeminiService) {
    const config = vscode.workspace.getConfiguration('aiAutoCommit');
    const apiKey = config.get<string>('geminiApiKey');
    
    if (!apiKey) {
        vscode.window.showWarningMessage('No API key configured. Please configure your Gemini API key first.');
        return;
    }

    const isConnected = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Testing Gemini API connection...',
        cancellable: false
    }, async () => {
        return await geminiService.testConnection(apiKey);
    });

    if (isConnected) {
        vscode.window.showInformationMessage('✅ Connection successful! Gemini API is working correctly.');
    } else {
        vscode.window.showErrorMessage('❌ Connection failed. Please check your API key and internet connection.');
    }
}

export function deactivate() {
    if (statusBarItem) {
        statusBarItem.dispose();
    }
}