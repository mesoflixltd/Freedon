const NEON_CONNECTION_STRING = "postgresql://neondb_owner:npg_C1vbMmY8XkaZ@ep-frosty-sound-ap7f6qtg-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const NEON_SQL_URL = "https://ep-frosty-sound-ap7f6qtg-pooler.c-7.us-east-1.aws.neon.tech/sql";

export function escapeSql(val: string | number | null | undefined): string {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return String(val);
    return `'${String(val).replace(/'/g, "''")}'`;
}

export async function runQuery(query: string): Promise<any[]> {
    try {
        const response = await fetch(NEON_SQL_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'neon-connection-string': NEON_CONNECTION_STRING
            },
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Database query failed');
        }

        const data = await response.json();
        return data.rows || [];
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}
