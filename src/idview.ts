import * as vscode from 'vscode';
import { logger } from './logging';
import * as cheerio from 'cheerio';
import path from 'path';

interface DefaultIDItem {
    ID: string;
    Type: string;
    Description: string;
}
type DefaultIDMap = Record<string, DefaultIDItem[]>;

export class MyTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null> = new vscode.EventEmitter<vscode.TreeItem | undefined | null>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null> = this._onDidChangeTreeData.event;

    private parentChildMap: TreeNode[] = [];
    private defaultIDs: DefaultIDMap = {};
    public treeView: vscode.TreeView<vscode.TreeItem> | undefined = undefined;

    constructor() {
        this.loadDefaultIDs();
        this.getDefaultIDs();
    }

    private async loadDefaultIDs() {
        const url = 'https://kodi.wiki/index.php?title=List_of_Built_In_Controls';

        try {
            const response = await fetch(url);
            const htmlString = await response.text();

            const $ = cheerio.load(htmlString);

            // Iterate through each <h3> and its corresponding table
            $("h3").each((_, heading) => {
                const span = $(heading).find("span.mw-headline");
                const objectName = span.attr("id");

                if (objectName) {
                    this.defaultIDs[objectName] = [];

                    // Find the next table after the current heading
                    const table = $(heading).next("table.prettytable");
                    table.find("tbody tr").each((index, row) => {
                        if (index === 0) { return; } // Skip the header row

                        const columns = $(row).find("td");
                        const id = $(columns[0]).text().trim();
                        const type = $(columns[1]).text().trim();
                        const description = $(columns[2]).text().trim();

                        if (id && type && description) {
                            this.defaultIDs[objectName].push({
                                ID: id,
                                Type: type,
                                Description: description,
                            });
                        }
                    });
                }
            });
            this.refresh();
        } catch (error) {
            logger.log(`Error loading default ID's: ${error}`);
        }
    }

    getDefaultIDs() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }

        const name = path.basename(editor.document.fileName);

        let subNodes: TreeNode[] | undefined = [];

        if (!this.treeView) { return; }
        this.treeView.title = `Control ID's - ${name}`;

        if (this.defaultIDs[name]) {
            this.defaultIDs[name].forEach((item: DefaultIDItem) => {
                subNodes.push(new TreeNode(`${item.ID}  -  ${item.Type?.[0]?.toUpperCase() + item.Type?.slice(1) || ""}  -  ${item.Description}`, { command: 'extension.treeItemClick', title: '', arguments: [{ id: item.ID }] }));
            });
            this.parentChildMap = [new TreeNode('Documented controls', undefined, vscode.TreeItemCollapsibleState.Collapsed, subNodes)];
        }
    }

    findControls() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }

        const regex = /<control[^>]*\b(id="([^"]+)"[^>]*type="([^"]+)"|type="([^"]+)"[^>]*id="([^"]+)")/g;
        const results: { id: string; type: string; index: number }[] = [];
        let match;

        let subNodes: TreeNode[] | undefined = [];

        while ((match = regex.exec(editor.document.getText())) !== null) {
            const id = match[2] || match[5];
            const type = match[3] || match[4];
            const index = match.index + match[0].indexOf(`id="${id}"`);
            const item = `${id.trim()}  -  ${type?.[0]?.toUpperCase() + type?.slice(1) || ""}`;
            if (!isNaN(Number(id))) {
                subNodes.push(new TreeNode(item, { command: 'extension.treeItemClick', title: '', arguments: [{ index: index }] }));
            }
        }
        if (subNodes.length > 0) {
            const sorted = subNodes.sort((a, b) => {
                const numA = parseInt((a.label as string)?.split(" - ")[0], 10);
                const numB = parseInt((b.label as string)?.split(" - ")[0], 10);
                return numA - numB;
            });
            this.parentChildMap.push(new TreeNode("Used ID's", undefined, vscode.TreeItemCollapsibleState.Expanded, sorted));
        }
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

    refresh(): void {
        this.parentChildMap = [];
        this.getDefaultIDs();
        this.findControls();
        this._onDidChangeTreeData.fire(null);
    }
}

export class TreeNode extends vscode.TreeItem {
    children: TreeNode[];

    constructor(label: string, command?: vscode.Command, collapsed?: vscode.TreeItemCollapsibleState, children: TreeNode[] = []) {
        super(label, children.length ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
        this.collapsibleState = collapsed;
        this.children = children;
        this.command = command;
    }
}