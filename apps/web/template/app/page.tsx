'use client';

import { useState } from 'react';
// Task type
interface Task {
  id: number;
  text: string;
  status: 'todo' | 'inProgress' | 'done';
}

// Task Card Component
const TaskCard = ({ task, moveTask }: { task: Task; moveTask: (id: number, status: 'todo' | 'inProgress' | 'done') => void }) => {
  return (
    <div
      className={`p-4 bg-white dark:bg-gray-800 rounded-md shadow-md mb-2 cursor-move transition-opacity`}
    >
      <p className="text-gray-900 dark:text-gray-100">{task.text}</p>
    </div>
  );
};

// Column Component
const Column = ({ 
  status, 
  tasks, 
  moveTask 
}: { 
  status: 'todo' | 'inProgress' | 'done'; 
  tasks: Task[]; 
  moveTask: (id: number, status: 'todo' | 'inProgress' | 'done') => void;
}) => {
  const titles = {
    todo: 'To Do',
    inProgress: 'In Progress',
    done: 'Done',
  };

  return (
    <div 
      className={`w-full h-full bg-gray-100 dark:bg-gray-900 rounded-lg p-4 transition-all`}
    >
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
        {titles[status]} ({tasks.length})
      </h2>
      <div className="space-y-2">
        {tasks.filter(task => task.status === status).map(task => (
          <TaskCard key={task.id} task={task} moveTask={moveTask} />
        ))}
      </div>
    </div>
  );
};

export default function Page() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, text: 'Research project requirements', status: 'todo' },
    { id: 2, text: 'Create wireframes', status: 'todo' },
    { id: 3, text: 'Setup project structure', status: 'inProgress' },
    { id: 4, text: 'Design UI components', status: 'inProgress' },
    { id: 5, text: 'Write documentation 1', status: 'done' },
    { id: 6, text: 'Write documentation 2', status: 'done' },
    { id: 7, text: 'Write documentation 3', status: 'done' },
    { id: 8, text: 'Write documentation 4', status: 'done' },
    { id: 9, text: 'Write documentation 5', status: 'done' },
    { id: 10, text: 'Write documentation 6 Write documentation 6Write documentation 6Write documentation 6Write documentation 6Write documentation 6Write documentation 6', status: 'done' },
  ]);

  const moveTask = (id: number, newStatus: 'todo' | 'inProgress' | 'done') => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, status: newStatus } : task
    ));
  };

  return (
    <div>
      <div className="w-full min-h-screen flex flex-col p-4 bg-white dark:bg-black transition-colors duration-200">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
          Task Management Board
        </h1>
        <div className="flex flex-col md:flex-row gap-4 flex-1">
          <Column status="todo" tasks={tasks} moveTask={moveTask} />
          <Column status="inProgress" tasks={tasks} moveTask={moveTask} />
          <Column status="done" tasks={tasks} moveTask={moveTask} />
        </div>
      </div>
    </div>
  );
}
