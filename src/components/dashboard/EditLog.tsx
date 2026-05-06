import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const EditLog = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [log, setLog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchLog = async () => {
      try {
        const ref = doc(db, 'logs', id!);
        const snapshot = await getDoc(ref);
        if (snapshot.exists()) {
          setLog({ id: snapshot.id, ...snapshot.data() });
        } else {
          alert('Log not found.');
          navigate('/all-logs');
        }
      } catch (err) {
        console.error('Error fetching log:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLog();
  }, [id, navigate]);

  const handleSave = async () => {
    if (!log) return;

    setSaving(true);
    try {
      const ref = doc(db, 'logs', log.id);
      const parsedActualHours = Number(log.actualHoursSpent);
      await updateDoc(ref, {
        tasksCompleted: log.tasksCompleted || '',
        feedback: log.feedback || '',
        problems: log.problems || '',
        moodRating: log.moodRating || null,
        actualHoursSpent: log.actualHoursSpent === '' || log.actualHoursSpent == null || Number.isNaN(parsedActualHours)
          ? null
          : Math.max(0, parsedActualHours),
        taskStatus: log.taskStatus || 'todo',
        projectId: log.projectId || null, // Save project association
      });

      navigate('/all-logs');
    } catch (err) {
      console.error('Error updating log:', err);
      alert('Failed to update log.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center text-gray-400 p-8">Loading log data...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 px-4 py-8 max-w-3xl mx-auto">
      <Button
        variant="outline"
        onClick={() => navigate(-1)}
        className="mb-6 border-gray-600 hover:border-cyan-400 hover:bg-gray-800/50"
      >
        <ChevronLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <h1 className="text-3xl font-bold text-cyan-400 mb-6">Edit Log</h1>

      <div className="space-y-4">
        <div>
          <Label className="text-gray-300">Tasks Completed</Label>
          <Textarea
            value={log.tasksCompleted}
            onChange={(e) => setLog({ ...log, tasksCompleted: e.target.value })}
            className="bg-gray-800 border border-gray-700 text-white"
          />
        </div>

        <div>
          <Label className="text-gray-300">Feedback / Notes</Label>
          <Textarea
            value={log.feedback}
            onChange={(e) => setLog({ ...log, feedback: e.target.value })}
            className="bg-gray-800 border border-gray-700 text-white"
          />
        </div>

        <div>
          <Label className="text-gray-300">Problems / Challenges</Label>
          <Textarea
            value={log.problems}
            onChange={(e) => setLog({ ...log, problems: e.target.value })}
            className="bg-gray-800 border border-gray-700 text-white"
          />
        </div>

        <div>
          <Label className="text-gray-300">Mood Rating (1–5)</Label>
          <Input
            type="number"
            min={1}
            max={5}
            value={log.moodRating ?? ''}
            onChange={(e) => setLog({ ...log, moodRating: parseInt(e.target.value) })}
            className="bg-gray-800 border border-gray-700 text-white"
          />
        </div>

        <div>
          <Label className="text-gray-300">Hours Spent</Label>
          <Input
            type="number"
            min={0}
            step={0.25}
            value={log.actualHoursSpent ?? ''}
            onChange={(e) => setLog({ ...log, actualHoursSpent: e.target.value })}
            placeholder="Optional"
            className="bg-gray-800 border border-gray-700 text-white"
          />
        </div>

        <div>
          <Label className="text-gray-300">Research Project</Label>
          {userProfile?.researchProjects && userProfile.researchProjects.length > 0 ? (
            <Select
              value={log.projectId || ''}
              onValueChange={(value) => setLog({ ...log, projectId: value })}
            >
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {userProfile.researchProjects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.researchTitle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-gray-400 italic">No projects available</p>
          )}
        </div>

        <div>
          <Label className="text-gray-300">Task Status</Label>
          <select
            value={log.taskStatus}
            onChange={(e) => setLog({ ...log, taskStatus: e.target.value })}
            className="bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded w-full"
          >
            <option value="todo">To Do</option>
            <option value="inprogress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};

export default EditLog;
