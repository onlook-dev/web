import { db } from './client';
import { projects, userProjects, users } from './schema';

const projectId = '11111111-2222-3333-4444-555555555555';
const userId = '5c62ba72-1f4a-4293-aa89-07b99b164353';

export const seedDb = async () => {
    console.log('Seeding the database..');

    await db.insert(users).values({
        id: userId,
    });

    await db.insert(projects).values({
        id: projectId,
        name: 'Test Project',
        previewUrl: 'https://www.google.com',
        sandboxId: '123',
        sandboxUrl: 'https://www.google.com/sandbox',
        previewImg: 'https://www.google.com',
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    await db.insert(userProjects).values({
        userId: userId,
        projectId: projectId,
    });

    console.log('Database seeded!');
};

const resetDb = async () => {
    console.log('Resetting the database..');
    await db.delete(users);
    await db.delete(projects);
    await db.delete(userProjects);
    console.log('Database reset!');
};

(async () => {
    try {
        await resetDb();
        await seedDb();
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
})();