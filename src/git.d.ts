import { Uri, Event, Disposable } from 'vscode';

export interface GitExtension {
    readonly enabled: boolean;
    readonly onDidChangeEnablement: Event<boolean>;
    getAPI(version: 1): API;
}

export interface API {
    readonly repositories: Repository[];
    readonly onDidOpenRepository: Event<Repository>;
    readonly onDidCloseRepository: Event<Repository>;
}

export interface Repository {
    readonly rootUri: Uri;
    readonly inputBox: SourceControlInputBox;
    readonly state: RepositoryState;
    
    commit(message: string, opts?: CommitOptions): Promise<void>;
    getCommit(ref: string): Promise<Commit>;
    getBranch(name: string): Promise<Branch>;
    diff(cached?: boolean): Promise<string>;
    show(ref: string, path: string): Promise<string>;
    clean(paths: string[]): Promise<void>;
    apply(patch: string, reverse?: boolean): Promise<void>;
}

export interface SourceControlInputBox {
    value: string;
    readonly onDidChange: Event<string>;
}

export interface RepositoryState {
    readonly HEAD: Branch | undefined;
    readonly refs: Ref[];
    readonly remotes: Remote[];
    readonly submodules: Submodule[];
    readonly rebaseCommit: Commit | undefined;
    readonly mergeChanges: Change[];
    readonly indexChanges: Change[];
    readonly workingTreeChanges: Change[];
    readonly onDidChange: Event<void>;
}

export interface Change {
    readonly uri: Uri;
    readonly originalUri: Uri;
    readonly renameUri: Uri | undefined;
    readonly status: Status;
}

export enum Status {
    INDEX_MODIFIED,
    INDEX_ADDED,
    INDEX_DELETED,
    INDEX_RENAMED,
    INDEX_COPIED,
    MODIFIED,
    DELETED,
    UNTRACKED,
    IGNORED,
    INTENT_TO_ADD,
    BOTH_DELETED,
    ADDED_BY_US,
    DELETED_BY_THEM,
    ADDED_BY_THEM,
    DELETED_BY_US,
    BOTH_ADDED,
    BOTH_MODIFIED
}

export interface Branch extends Ref {
    readonly upstream?: Ref;
    readonly ahead?: number;
    readonly behind?: number;
}

export interface Ref {
    readonly type: RefType;
    readonly name?: string;
    readonly commit?: string;
    readonly remote?: string;
}

export enum RefType {
    Head,
    RemoteHead,
    Tag
}

export interface Remote {
    readonly name: string;
    readonly fetchUrl?: string;
    readonly pushUrl?: string;
    readonly isReadOnly: boolean;
}

export interface Submodule {
    readonly name: string;
    readonly path: string;
    readonly url: string;
}

export interface Commit {
    readonly hash: string;
    readonly message: string;
    readonly parents: string[];
    readonly authorDate?: Date;
    readonly authorName?: string;
    readonly authorEmail?: string;
    readonly commitDate?: Date;
}

export interface CommitOptions {
    all?: boolean;
    amend?: boolean;
    signoff?: boolean;
    signCommit?: boolean;
    empty?: boolean;
    noVerify?: boolean;
}