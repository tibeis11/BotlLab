import { createTestUser, deleteTestUser } from './supabase-admin';

async function main() {
    const email = `debug-${Date.now()}@example.com`;
    const password = 'DebugPassword123!';

    try {
        console.log('Testing createTestUser...');
        const user = await createTestUser(email, password);
        console.log('User created:', user.id);

        console.log('Testing deleteTestUser...');
        await deleteTestUser(email);
        console.log('User deleted successfully.');
    } catch (e) {
        console.error('Debug failed:', e);
    }
}

main();
