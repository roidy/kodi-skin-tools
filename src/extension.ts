/**
 * File: extension.ts
 * Author: roidy
 * License: GPL v3 - https://www.gnu.org/licenses/gpl-3.0.html
 */

import * as vscode from 'vscode';
import { logger, LogLevel } from './logging';
import { config } from './configuration';
import { localize } from './localize';
import { decorator } from './decorator';
import { po } from './po-file';
import { findWordInFiles, reloadKodiSkin } from './utils';
import { DefinitionProvider } from './definition';
import { ReferenceProvider } from './reference';
import { ColorProvider } from './color';
import { colors } from './color';
import { IdViewDataProvider } from './idview';
import { ReportsDataProvider } from './reports';

let colorProviderDisposable: vscode.Disposable | undefined;

/**
 * Activate the Kodi Skin Tools extension.
 */
export function activate(context: vscode.ExtensionContext) {

    logger.log('Kodi Skin Tools is active.', LogLevel.Info);

    // Create the TreeDataProviders
    const idViewProvider = new IdViewDataProvider();
    const reportsProvider = new ReportsDataProvider();

    // Create and register the TreeViews
    idViewProvider.treeView = vscode.window.createTreeView("idView", {
        treeDataProvider: idViewProvider,
        showCollapseAll: true,
    });
    reportsProvider.treeView = vscode.window.createTreeView("reportsView", {
        treeDataProvider: reportsProvider,
        showCollapseAll: true,
    });

    idViewProvider.refresh();

    decorator.context = context;
    let throttleTimeout: NodeJS.Timeout | undefined;
    // Force an initial decoration update.
    decorator.updateDecorations();

    /**
     * Register all commands.
     */
    context.subscriptions.push(
        vscode.commands.registerCommand('kodi-skin-tools.Localize', () => {
            localize.run();
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('kodi-skin-tools.NewTranslation', () => {
            po.generateTranslation();
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.idViewItemClick', (args: { id: string, index: string }) => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) { return; }
            let index: number;
            if (args.id) {
                const search = `id="${args.id}"`;
                index = editor.document.getText().indexOf(search);
                if (index === -1) {
                    const position = editor.selection.active;
                    editor.selection = new vscode.Selection(position, position);
                    return;
                }
            }
            if (args.index) {
                index = Number(args.index);
            }
            if (index!) {
                const position = editor.document.positionAt(index);
                const lineRange = editor.document.lineAt(position.line).range;
                editor.selection = new vscode.Selection(lineRange.start, lineRange.end);
                editor.revealRange(lineRange, vscode.TextEditorRevealType.Default);
            }
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.runReferenceLookup', async (args: { search: string }) => {
            if (args.search) {
                logger.log(args.search);
                const locations = await findWordInFiles(args.search);

                if (locations && locations.length > 0) {
                    // Get the first location to use as the source reference
                    const firstLocation = locations[0];

                    // Show references in the panel
                    await vscode.commands.executeCommand(
                        'editor.action.showReferences',
                        firstLocation.uri,
                        firstLocation.range.start,
                        locations
                    );
                }
            }
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('kodi-skin-tools.runReport', () => {
            reportsProvider.run();
        })
    );

    /**
     * Register all events.
     */

    // Settings changed
    vscode.workspace.onDidChangeConfiguration(() => {
        config.loadConfig();
    }, null, context.subscriptions);

    // Active text editor changed
    vscode.window.onDidChangeActiveTextEditor(async editor => {
        if (editor) {
            if (editor.document.fileName.includes('colors/defaults.xml')) {
                colors.documentsGetNamedColors();
            }
            decorator.activeEditor = editor;
            decorator.updateDecorations();
        }
        idViewProvider.refresh();
    }, null, context.subscriptions);

    // An edit was made to the current text document
    vscode.workspace.onDidChangeTextDocument(event => {
        if (event.document === vscode.window.activeTextEditor?.document) {
            if (throttleTimeout) {
                clearTimeout(throttleTimeout);
            }

            throttleTimeout = setTimeout(() => {
                idViewProvider.refresh();
                decorator.updateDecorations();
                throttleTimeout = undefined; // Reset the timeout
            }, 600); // Throttle for 300ms

        }
    }, null, context.subscriptions);

    // Document saved
    vscode.workspace.onDidSaveTextDocument(document => {
        idViewProvider.refresh();
        // Saved document was a po file so reload it.
        if (document.uri.fsPath.endsWith('.po')) {
            po.loadSkinPO();
        }
        // Saved document was the color file so reload it.
        if (document.uri.fsPath.includes('colors/defaults.xml')) {
            colors.loadColorFile();
            // Dispose of and re-register the ColorProvider to force any open editors to update.
            if (colorProviderDisposable) {
                colorProviderDisposable.dispose();
            }
            colorProviderDisposable = vscode.languages.registerColorProvider({ language: 'xml', scheme: 'file', pattern: '**/*.xml' },
                new ColorProvider()
            );
        }
        // If document has a known extension then reload the Kodi skin.
        const hasExtension = config.reloadExtensions!.some(extension => document.uri.fsPath.endsWith(extension));
        if (hasExtension) { reloadKodiSkin(); }
    }, null, context.subscriptions);

    /**
     * Register all providers
     */

    // Register definition provider
    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider('xml',
            new DefinitionProvider())
    );

    // Register reference provider
    context.subscriptions.push(
        vscode.languages.registerReferenceProvider('xml',
            new ReferenceProvider())
    );

    // Register definition provider
    colorProviderDisposable = vscode.languages.registerColorProvider({ language: 'xml', scheme: 'file', pattern: '**/*.xml' },
        new ColorProvider()
    );
}

/**
 * Deactivate the Kodi Skin Tools extension.
 */
export function deactivate() {
    if (colorProviderDisposable) {
        colorProviderDisposable.dispose();
    }
    logger.log('Kodi Skin Tools deactivated.', LogLevel.Info);
}

