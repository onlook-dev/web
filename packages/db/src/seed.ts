import { db } from './client';
import { projects, userProjects, users, type Project, type User } from './schema';

const user = {
    id: '5c62ba72-1f4a-4293-aa89-07b99b164353'
} satisfies User;

const project = {
    id: '11111111-2222-3333-4444-555555555555',
    name: 'Test Project',
    sandboxId: '123',
    sandboxUrl: 'http://localhost:8084',
    previewImg: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
    createdAt: new Date(),
    updatedAt: new Date(),
} satisfies Project;

const project1 = {
    id: '22222222-3333-4444-5555-666666666666',
    name: 'Test Project 1',
    sandboxId: '3f5rf6',
    sandboxUrl: 'https://3f5rf6-8084.csb.app',
    previewImg: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
    createdAt: new Date(),
    updatedAt: new Date(),
} satisfies Project;

export const seedDb = async () => {
    console.log('Seeding the database..');

    await db.insert(users).values(user);

    await db.insert(projects).values([
        project,
        project1,
    ]);

    await db.insert(userProjects).values([{
        userId: user.id,
        projectId: project.id,
    }, {
        userId: user.id,
        projectId: project1.id,
    }]);

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