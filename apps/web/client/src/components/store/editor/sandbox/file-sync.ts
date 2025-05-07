import localforage from 'localforage';
import { makeAutoObservable } from 'mobx';
export class FileSyncManager {
    private cache: Map<string, string>;
    private storageKey = 'file-sync-cache';

    constructor() {
        this.cache = new Map<string, string>([
            ["src/app/layout.tsx", "export default function RootLayout({ children }: { children: React.ReactNode }) {\n  return <html><body>{children}</body></html>;\n}"],
            ["src/app/page.tsx", "export default function HomePage() {\n  return <main>Welcome to the homepage</main>;\n}"],
            ["src/app/about/page.tsx", "export default function AboutPage() {\n  return <section>About us</section>;\n}"],
            ["src/app/dashboard/layout.tsx", "export default function DashboardLayout({ children }: { children: React.ReactNode }) {\n  return <div className='dashboard'>{children}</div>;\n}"],
            ["src/app/dashboard/page.tsx", "export default function DashboardHome() {\n  return <h1>Dashboard Overview</h1>;\n}"],
            ["src/app/dashboard/analytics/page.tsx", "export default function AnalyticsPage() {\n  return <div>Analytics Data</div>;\n}"],
            ["src/app/dashboard/settings/page.tsx", "export default function SettingsPage() {\n  return <form>Settings form</form>;\n}"],
            ["src/components/ui/button.tsx", "export const Button = ({ children }: { children: React.ReactNode }) => <button className='btn'>{children}</button>;"],
            ["src/components/ui/input.tsx", "export const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />;"],
            ["src/components/file-tree/TreeNode.tsx", "export const TreeNode = ({ name }: { name: string }) => <div>{name}</div>;"],
            ["src/components/file-tree/TreeView.tsx", "export const TreeView = ({ files }: { files: string[] }) => <div>{files.map(f => <div key={f}>{f}</div>)}</div>;"],
            ["src/components/layout/Header.tsx", "export const Header = () => <header>Header</header>;"],
            ["src/components/layout/Sidebar.tsx", "export const Sidebar = () => <aside>Sidebar content</aside>;"],
            ["src/components/layout/Footer.tsx", "export const Footer = () => <footer>Footer</footer>;"],
            ["src/lib/utils/formatDate.ts", "export function formatDate(date: Date): string {\n  return date.toISOString();\n}"],
            ["src/lib/utils/generateId.ts", "export function generateId(): string {\n  return Math.random().toString(36).substr(2, 9);\n}"],
            ["src/lib/hooks/useToggle.ts", "import { useState } from 'react';\nexport function useToggle(initial = false) {\n  const [state, setState] = useState(initial);\n  const toggle = () => setState(!state);\n  return [state, toggle] as const;\n}"],
            ["src/lib/constants/appConfig.ts", "export const appConfig = {\n  appName: 'MyNextApp',\n  version: '1.0.0'\n};"],
            ["src/styles/globals.css", "body { margin: 0; font-family: sans-serif; }"],
            ["src/styles/components/button.css", ".btn { background: blue; color: white; padding: 0.5em 1em; }"],
            ["public/favicon.ico", "<binary content placeholder>"],
            ["public/images/logo.png", "<binary content placeholder>"],
            ["public/assets/sample.json", "{ \"example\": true }"],
            ["tsconfig.json", "{\n  \"compilerOptions\": {\n    \"target\": \"ESNext\",\n    \"module\": \"ESNext\",\n    \"jsx\": \"preserve\",\n    \"strict\": true\n  }\n}"],
            ["next.config.js", "module.exports = {\n  reactStrictMode: true,\n};"],
            ["package.json", "{\n  \"name\": \"nextjs-app\",\n  \"version\": \"1.0.0\",\n  \"scripts\": {\n    \"dev\": \"next dev\",\n    \"build\": \"next build\",\n    \"start\": \"next start\"\n  }\n}"],
            ["README.md", "# My Next.js App\n\nThis is a sample project."],
            [".eslintrc.json", "{\n  \"extends\": [\"next/core-web-vitals\"]\n}"],
            [".gitignore", "node_modules/\n.next/\ndist/\n.env\n"]
          ]);
        
        this.restoreFromLocalStorage();
        makeAutoObservable(this);
    }

    has(filePath: string) {
        return this.cache.has(filePath);
    }

    async readOrFetch(
        filePath: string,
        readFile: (path: string) => Promise<string | null>,
    ): Promise<string | null> {
        if (this.has(filePath)) {
            return this.cache.get(filePath) ?? null;
        }

        try {
            const content = await readFile(filePath);
            if (content) {
                this.cache.set(filePath, content);
                await this.saveToLocalStorage();
            }
            return content;
        } catch (error) {
            console.error(`Error reading file ${filePath}:`, error);
            return null;
        }
    }

    async write(
        filePath: string,
        content: string,
        writeFile: (path: string, content: string) => Promise<boolean>,
    ): Promise<boolean> {
        try {
            const success = await writeFile(filePath, content);
            if (success) {
                this.cache.set(filePath, content);
                await this.saveToLocalStorage();
            }
            return success;
        } catch (error) {
            console.error(`Error writing file ${filePath}:`, error);
            return false;
        }
    }

    async updateCache(filePath: string, content: string): Promise<void> {
        this.cache.set(filePath, content);
        await this.saveToLocalStorage();
    }

    async delete(filePath: string) {
        this.cache.delete(filePath);
        await this.saveToLocalStorage();
    }

    listAllFiles() {
        return Array.from(this.cache.keys());
    }

    private async restoreFromLocalStorage() {
        try {
            const storedCache = await localforage.getItem<Record<string, string>>(this.storageKey);
            if (storedCache) {
                Object.entries(storedCache).forEach(([key, value]) => {
                    this.cache.set(key, value);
                });
            }
        } catch (error) {
            console.error('Error restoring from localForage:', error);
        }
    }

    private async saveToLocalStorage() {
        try {
            const cacheObject = Object.fromEntries(this.cache.entries());
            await localforage.setItem(this.storageKey, cacheObject);
        } catch (error) {
            console.error('Error saving to localForage:', error);
        }
    }

    private async clearLocalStorage() {
        try {
            await localforage.removeItem(this.storageKey);
        } catch (error) {
            console.error('Error clearing localForage:', error);
        }
    }

    async clear() {
        this.cache.clear();
        this.cache = new Map();
        await this.clearLocalStorage();
    }
}
