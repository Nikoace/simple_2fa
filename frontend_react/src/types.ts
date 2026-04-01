export interface Account {
    id: number;
    name: string;
    issuer: string;
    code: string;
    ttl: number;
}

export interface ImportResult {
    imported: number;
    skipped: number;
    overwritten: number;
    errors: string[];
}

export type DuplicateStrategy = 'Skip' | 'Overwrite';

export interface ImportPreviewAccount {
    name: string;
    issuer: string | null;
}
