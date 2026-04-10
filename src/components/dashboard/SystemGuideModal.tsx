import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { HelpCircle, Terminal, Plus, Calendar, TrendingUp, FileText, ListTodo, Bell, Users } from 'lucide-react';

const SystemGuideModal = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-cyan-400/50 hover:bg-cyan-900/30 text-cyan-400"
          title="System Guide"
        >
          <HelpCircle className="w-5 h-5 sm:mr-2" />
          <span className="hidden sm:inline">GUIDE</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-gray-900 border border-cyan-400/20 text-gray-200">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl text-cyan-400 pb-2 border-b border-gray-700">
            <HelpCircle className="w-6 h-6 mr-2" />
            SYSTEM QUICK GUIDE
          </DialogTitle>
          <DialogDescription className="text-gray-400 mt-2">
            Welcome to your research tracker! Here's a quick overview of what each section does.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          
          <div className="flex items-start gap-3 border border-gray-800 p-3 rounded-lg bg-gray-800/30">
            <div className="p-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg shrink-0">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">NEW LOG</h3>
              <p className="text-sm text-gray-400 mt-1">
                Document your daily or weekly progress. Record tasks completed, problems encountered, and your mood. This is the core of tracking your research journey.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 border border-gray-800 p-3 rounded-lg bg-gray-800/30">
            <div className="p-2 bg-gray-700 rounded-lg shrink-0">
              <FileText className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">ALL LOGS</h3>
              <p className="text-sm text-gray-400 mt-1">
                View your historical log entries. You can filter, search, and review past progress to understand how your research has evolved.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 border border-gray-800 p-3 rounded-lg bg-gray-800/30">
            <div className="p-2 bg-gray-700 rounded-lg shrink-0">
              <ListTodo className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">TASKS</h3>
              <p className="text-sm text-gray-400 mt-1">
                Manage your to-do lists. Categorize tasks by priority and status (To Do, In Progress, Done). Tasks help you organize your daily work efficiently.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 border border-gray-800 p-3 rounded-lg bg-gray-800/30">
            <div className="p-2 bg-gray-700 rounded-lg shrink-0">
              <Bell className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">ALERTS</h3>
              <p className="text-sm text-gray-400 mt-1">
                Stay updated on important events. The system analyzes your work and notifies you of impending deadlines, potential risks, or pending critical tasks.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 border border-gray-800 p-3 rounded-lg bg-gray-800/30">
            <div className="p-2 bg-gray-700 rounded-lg shrink-0">
              <Calendar className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">CALENDAR</h3>
              <p className="text-sm text-gray-400 mt-1">
                A visual timeline of your tasks and logs. Great for seeing the bigger picture of your schedule and deadlines over the month.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 border border-gray-800 p-3 rounded-lg bg-gray-800/30">
            <div className="p-2 bg-gray-700 rounded-lg shrink-0">
              <TrendingUp className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">REPORT</h3>
              <p className="text-sm text-gray-400 mt-1">
                Analytics and statistics about your research. Track your productivity, task completion rates, and average mood trends over time.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 border border-gray-800 p-3 rounded-lg bg-gray-800/30">
            <div className="p-2 bg-gray-700 rounded-lg shrink-0">
              <Terminal className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">RESEARCH PROJECTS</h3>
              <p className="text-sm text-gray-400 mt-1">
                Set up the foundations! Before logging progress, define what you are researching here, including the abstract, field, and timeline. 
              </p>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SystemGuideModal;
