export type TokenUser = {
    id: string;
    role: "admin" | "user";
    email: string;
};
export declare function signAccessToken(user: TokenUser): string;
export declare function verifyAccessToken(token: string): TokenUser | null;
