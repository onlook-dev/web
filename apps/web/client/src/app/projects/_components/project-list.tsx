"use client"

import { useEffect, useState } from 'react';
import { Button } from '@onlook/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@onlook/ui/card';
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';
import { useRouter } from 'next/navigation';
import { type Project } from '@onlook/db';

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const router = useRouter();

  useEffect(() => {
    async function fetchProjects() {
      try {
        const response = await fetch('/api/projects');
        const data = await response.json();
        setProjects(data.projects || []);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, []);

  const handleCreateProject = async () => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProject),
      });

      const data = await response.json();
      
      if (data.project) {
        setProjects([...projects, data.project]);
        setNewProject({ name: '', description: '' });
      }
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Your Projects</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Create New Project Card */}
        <Card>
          <CardHeader>
            <CardTitle>Create New Project</CardTitle>
            <CardDescription>Start a new project from scratch</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="Project name" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input 
                  id="description" 
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="Project description" 
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleCreateProject} disabled={!newProject.name}>Create Project</Button>
          </CardFooter>
        </Card>
        
        {/* Project Cards */}
        {loading ? (
          <div>Loading projects...</div>
        ) : (
          projects.map((project) => (
            <Card key={project.id}>
              <CardHeader>
                <CardTitle>{project.name}</CardTitle>
                <CardDescription>{project.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Created: {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
              <CardFooter>
                <Button onClick={() => router.push(`/project/${project.id}`)}>
                  Open Project
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
