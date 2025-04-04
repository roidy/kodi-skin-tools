/**
 * File: reports.ts
 * Author: roidy
 * License: GPL v3 - https://www.gnu.org/licenses/gpl-3.0.html
 */

import * as vscode from 'vscode';
import { TreeNode } from './idview';
import { config } from './configuration';

export class ReportsDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null> = new vscode.EventEmitter<vscode.TreeItem | undefined | null>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null> = this._onDidChangeTreeData.event;

    private parentChildMap: TreeNode[] = [];
    public treeView: vscode.TreeView<vscode.TreeItem> | undefined = undefined;

    private media: string[] = [];

    constructor() {
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TreeNode): Thenable<TreeNode[]> {
        if (!element) {
            // If no parent element, return the root nodes (parents)
            return Promise.resolve(this.parentChildMap);
        }
        // If the element has children, return them
        return Promise.resolve(element.children);
    }

    run(): void {
        this.scanMedia().then(() => {
            this.refresh();
        });
    }

    clear(): void {
        this.media.length = 0;
        this.parentChildMap.length = 0;
        this.refresh();
    }

    refresh(): void {
        if (this.parentChildMap.length === 0) {
            this.parentChildMap.push(new TreeNode("No data. Please run a scan."));
            this._onDidChangeTreeData.fire(null);
            return;
        }

        this.parentChildMap = [];
        let subNodes: TreeNode[] | undefined = [];
        this.media.forEach((s) => {
            subNodes.push(new TreeNode(s));
        });

        this.parentChildMap = [new TreeNode('Unused media', undefined, vscode.TreeItemCollapsibleState.Collapsed, subNodes)];

        this._onDidChangeTreeData.fire(null);
    }

    async scanMedia(): Promise<void> {
        // Find all media
        let files = await vscode.workspace.findFiles(`media/**/*`, config.mediaExcludeGlob);
        let list: string[] = [];
        for (const file of files) {
            const f = vscode.workspace.asRelativePath(file).slice(6);
            if (!config.mediaExcludeKeywords?.some(substring => f.includes(substring))) {
                list.push(f.toString());
            }
        }
        // Search entire workspace for media
        files = await vscode.workspace.findFiles(`**/*.xml`);
        for (const file of files) {
            const document = await vscode.workspace.openTextDocument(file);
            const text = document.getText().toLowerCase();
            list = list.filter(str => !text.includes(str.toLowerCase()));
            if (list.length === 0) {
                break;
            }
        }
        // Sort media list a-z
        this.media = list.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        return;
    }
}