import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('your-publisher.ai-auto-commit'));
    });

    test('Should register all commands', async () => {
        const commands = await vscode.commands.getCommands(true);
        
        assert.ok(commands.includes('aiAutoCommit.generateCommit'));
        assert.ok(commands.includes('aiAutoCommit.configureApiKey'));
    });

    test('Configuration should have default values', () => {
        const config = vscode.workspace.getConfiguration('aiAutoCommit');
        
        assert.strictEqual(config.get('commitStyle'), 'conventional');
        assert.strictEqual(config.get('maxDiffSize'), 5000);
        assert.strictEqual(config.get('autoCommit'), false);
    });
});