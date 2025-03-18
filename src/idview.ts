import * as vscode from 'vscode';

export class MyTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null> = new vscode.EventEmitter<vscode.TreeItem | undefined | null>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null> = this._onDidChangeTreeData.event;

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: vscode.TreeItem): vscode.TreeItem[] {
        if (!element) {
            return [
                new vscode.TreeItem('Home.xml', vscode.TreeItemCollapsibleState.Collapsed),
                new vscode.TreeItem('MyVideosNav.xml', vscode.TreeItemCollapsibleState.Collapsed),
                new vscode.TreeItem('Settings.xml', vscode.TreeItemCollapsibleState.Collapsed)
            ];
        } else {
            return [
                new vscode.TreeItem('9000 - Control type="list"', vscode.TreeItemCollapsibleState.None),
                new vscode.TreeItem('9001 - Control type="button"', vscode.TreeItemCollapsibleState.None),
                new vscode.TreeItem('9500 - Control type="image"', vscode.TreeItemCollapsibleState.None)
            ];
        }
        return [];
    }

    refresh(): void {
        this._onDidChangeTreeData.fire(null);
    }
}