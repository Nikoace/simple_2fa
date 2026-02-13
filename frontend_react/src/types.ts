export interface Account {
    id: number;
    name: string;
    issuer: string | null;
    secret: string;
}
