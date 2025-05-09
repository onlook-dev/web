import { DefaultSettings } from '@onlook/constants';
import { FrameType } from '@onlook/models';
import { db } from './client';
import { canvas, frames, projects, userProjects, users, type Canvas, type Frame, type Project, type User } from './schema';
const user0 = {
    id: '5c62ba72-1f4a-4293-aa89-07b99b164353'
} satisfies User;

const project0 = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    name: 'Test Project',
    sandboxId: '123',
    sandboxUrl: 'http://localhost:8084',
    previewImg: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
    createdAt: new Date(),
    updatedAt: new Date(),
} satisfies Project;

const project1 = {
    id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    name: 'Test Project 1',
    sandboxId: '3f5rf6',
    sandboxUrl: 'https://3f5rf6-8084.csb.app',
    previewImg: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
    createdAt: new Date(),
    updatedAt: new Date(),
} satisfies Project;

const canvas0 = {
    id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    scale: DefaultSettings.SCALE.toString(),
    x: DefaultSettings.PAN_POSITION.x.toString(),
    y: DefaultSettings.PAN_POSITION.y.toString(),
    projectId: project0.id,
} satisfies Canvas;

const canvas1 = {
    id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    scale: DefaultSettings.SCALE.toString(),
    x: DefaultSettings.PAN_POSITION.x.toString(),
    y: DefaultSettings.PAN_POSITION.y.toString(),
    projectId: project1.id,
} satisfies Canvas;

const frame0 = {
    id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
    canvasId: canvas0.id,
    type: FrameType.WEB,
    url: project0.sandboxUrl,
    x: DefaultSettings.FRAME_POSITION.x.toString(),
    y: DefaultSettings.FRAME_POSITION.y.toString(),
    width: DefaultSettings.FRAME_DIMENSION.width.toString(),
    height: DefaultSettings.FRAME_DIMENSION.height.toString(),
} satisfies Frame;

const frame1 = {
    id: 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66',
    canvasId: canvas1.id,
    type: FrameType.WEB,
    url: project1.sandboxUrl,
    x: '200',
    y: '200',
    width: '500',
    height: '500',
} satisfies Frame;

export const seedDb = async () => {
    console.log('Seeding the database..');

    await db.transaction(async (tx) => {
        await tx.insert(users).values(user0);
        await tx.insert(projects).values([
            project0,
            project1,
        ]);
        await tx.insert(userProjects).values([{
            userId: user0.id,
            projectId: project0.id,
        }, {
            userId: user0.id,
            projectId: project1.id,
        }]);
        await tx.insert(canvas).values([
            canvas0,
            canvas1,
        ]);
        await tx.insert(frames).values([
            frame0,
            frame1,
        ]);
    });

    console.log('Database seeded!');
};

const resetDb = async () => {
    console.log('Resetting the database..');
    await db.transaction(async (tx) => {
        await tx.delete(frames);
        await tx.delete(canvas);
        await tx.delete(userProjects);
        await tx.delete(projects);
        await tx.delete(users);
    });

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