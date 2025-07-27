/**
 * File: reports.ts
 * Author: roidy
 * License: GPL v3 - https://www.gnu.org/licenses/gpl-3.0.html
 */

import * as vscode from 'vscode';
import { TreeNode } from './idview';
import { config } from './configuration';
import { DOMParser } from "@xmldom/xmldom";
import { findWordInFiles } from './utils';

export class ReportsDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null> = new vscode.EventEmitter<vscode.TreeItem | undefined | null>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null> = this._onDidChangeTreeData.event;

    private parentChildMap: TreeNode[] = [];
    public treeView: vscode.TreeView<vscode.TreeItem> | undefined = undefined;

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

    async run(): Promise<void> {
        // Clear previous report
        this.parentChildMap.length = 0;
        this._onDidChangeTreeData.fire(null);

        // Generate reports
        const scanResult = await this.scanMedia();
        if (scanResult) {
            this.parentChildMap.push(scanResult);
        }
        this.parentChildMap = this.parentChildMap.concat((await this.runCheck('expression', /\$EXP\[(.*?)\]/g)));
        this.parentChildMap = this.parentChildMap.concat((await this.runCheck('variable', /\$VAR\[(.*?)[\],]/g)));

        if (this.parentChildMap.length === 0) {
            this.parentChildMap.push(new TreeNode('No issues found.'));
        }

        // Update tree view
        this._onDidChangeTreeData.fire(null);
    }

    async scanMedia(): Promise<TreeNode | null> {
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

        let subNodes: TreeNode[] | undefined = [];
        // Sort media list a-z
        list.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())).forEach((s) => {
            subNodes.push(new TreeNode(s, undefined, vscode.TreeItemCollapsibleState.None, []));
        });

        if (subNodes.length === 0) {
            return null;
        }
        else {
            return new TreeNode('Unused media', undefined, vscode.TreeItemCollapsibleState.Collapsed, subNodes);
        }
    }

    async runCheck(element: string, regex: RegExp): Promise<TreeNode[]> {
        let files = await vscode.workspace.findFiles(`**/*.xml`);
        let names: Set<string> = new Set();
        let unused: Set<string> = new Set();
        for (const file of files) {
            const document = await vscode.workspace.openTextDocument(file);
            const text = document.getText();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, "application/xml");

            const elements = xmlDoc.getElementsByTagName(element);
            for (const element of elements) {
                const name = element.getAttribute('name');
                if (name) {
                    names.add(name);
                    unused.add(name);
                }
            }
        }

        files = await vscode.workspace.findFiles(`**/*.xml`);
        let undeclared: Set<string> = new Set();
        for (const file of files) {
            const document = await vscode.workspace.openTextDocument(file);
            const text = document.getText();
            let match;
            while ((match = regex.exec(text)) !== null) {
                const name = match[1];
                if (names.has(name)) {
                    unused.delete(name);
                }
                else {
                    if (!name.includes('$PARAM') && !name.includes('$INFO')) {
                        undeclared.add(name);
                    }
                }
            }
        }

        let subNodes: TreeNode[] | undefined = [];
        let unusedNames: TreeNode[] | undefined = [];
        let returnedTreeNodes: TreeNode[] = [];

        let param: string;
        // Sort undeclared a-z
        Array.from(undeclared.values()).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())).forEach((s) => {
            if (element === 'expression') {
                param = `\$EXP\[${s}\]`;
            }
            else {
                param = `\$VAR\[${s}\]`;
            }
            const command = { command: 'extension.runReferenceLookup', title: '', arguments: [{ search: param }] };
            subNodes.push(new TreeNode(s, command, vscode.TreeItemCollapsibleState.None, []));
        });
        // Sort names a-z
        Array.from(unused.values()).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())).forEach((s) => {
            if (element === 'expression') {
                param = `<expression name="${s}">`;
            }
            else {
                param = `<variable name="${s}">`;
            }
            const command = { command: 'extension.runReferenceLookup', title: '', arguments: [{ search: param }] };
            unusedNames.push(new TreeNode(s, command, vscode.TreeItemCollapsibleState.None, []));
        });


        if (unusedNames.length !== 0) {
            returnedTreeNodes.push(new TreeNode(`Unused ${element}'s`, undefined, vscode.TreeItemCollapsibleState.Collapsed, unusedNames));
        }

        if (subNodes.length !== 0) {
            returnedTreeNodes.push(new TreeNode(`Undeclared ${element}'s`, undefined, vscode.TreeItemCollapsibleState.Collapsed, subNodes));
        }

        return returnedTreeNodes;
    }
}