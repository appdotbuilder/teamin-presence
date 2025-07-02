
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Calendar, Trash2 } from 'lucide-react';
import type { 
  User, 
  PresenceEntry, 
  PresenceStatus, 
  CreatePresenceEntryInput, 
  UpdatePresenceEntryInput,
  DeletePresenceEntryInput,
  DashboardData 
} from '../../../server/src/schema';

interface PresenceFormProps {
  user: User;
  dashboardData: DashboardData | null;
  initialDate?: Date;
  existingEntry?: PresenceEntry;
  onClose: () => void;
  onUpdate: () => void;
}

export function PresenceForm({ 
  user, 
  dashboardData, 
  initialDate, 
  existingEntry, 
  onClose, 
  onUpdate 
}: PresenceFormProps) {
  const [selectedUserId, setSelectedUserId] = useState<number>(user.id);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const date = initialDate || new Date();
    return date.toISOString().split('T')[0];
  });
  const [selectedStatus, setSelectedStatus] = useState<PresenceStatus>(
    existingEntry?.status || 'In office'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation: Prevent scheduling beyond two weeks from current date
  const getMaxDate = useCallback(() => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 14);
    return maxDate.toISOString().split('T')[0];
  }, []);

  const getMinDate = useCallback(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }, []);

  // Initialize form for existing entry
  useEffect(() => {
    if (existingEntry) {
      setSelectedUserId(existingEntry.user_id);
      setSelectedDate(existingEntry.date.toISOString().split('T')[0]);
      setSelectedStatus(existingEntry.status);
    }
  }, [existingEntry]);

  const validateDate = (dateStr: string): boolean => {
    const selectedDate = new Date(dateStr);
    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 14);
    
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    maxDate.setHours(23, 59, 59, 999);
    
    return selectedDate >= today && selectedDate <= maxDate;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!validateDate(selectedDate)) {
      setError('Date must be within the next two weeks from today.');
      setIsLoading(false);
      return;
    }

    try {
      const date = new Date(selectedDate);
      date.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues

      if (existingEntry) {
        // Update existing entry
        const input: UpdatePresenceEntryInput = {
          id: existingEntry.id,
          status: selectedStatus,
          date: date
        };
        await trpc.updatePresenceEntry.mutate(input);
      } else {
        // Create new entry
        const input: CreatePresenceEntryInput = {
          user_id: selectedUserId,
          status: selectedStatus,
          date: date
        };
        await trpc.createPresenceEntry.mutate(input);
      }

      onUpdate();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save presence entry';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingEntry) return;

    setIsLoading(true);
    setError(null);

    try {
      const input: DeletePresenceEntryInput = {
        id: existingEntry.id
      };
      await trpc.deletePresenceEntry.mutate(input);
      onUpdate();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete presence entry';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const canManageOtherUsers = user.role === 'Manager';
  const availableUsers = dashboardData?.users || [user];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {existingEntry ? 'Update Presence Status' : 'Add Presence Status'}
          </DialogTitle>
          <DialogDescription>
            {existingEntry 
              ? 'Modify the presence status for the selected date.'
              : 'Schedule presence status up to two weeks in advance.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* User Selection (Manager only) */}
          {canManageOtherUsers && availableUsers.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="user-select">Team Member</Label>
              <Select 
                value={selectedUserId.toString()} 
                onValueChange={(value: string) => setSelectedUserId(parseInt(value))}
                disabled={!!existingEntry} // Can't change user for existing entries
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((availableUser: User) => (
                    <SelectItem key={availableUser.id} value={availableUser.id.toString()}>
                      {availableUser.name} ({availableUser.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date Selection */}
          <div className="space-y-2">
            <Label htmlFor="date-input">Date</Label>
            <Input
              id="date-input"
              type="date"
              value={selectedDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedDate(e.target.value)}
              min={getMinDate()}
              max={getMaxDate()}
              required
            />
            <p className="text-xs text-gray-500">
              You can schedule up to 2 weeks in advance
            </p>
          </div>

          {/* Status Selection */}
          <div className="space-y-2">
            <Label htmlFor="status-select">Presence Status</Label>
            <Select value={selectedStatus} onValueChange={(value: PresenceStatus) => setSelectedStatus(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="In office">🏢 In Office</SelectItem>
                <SelectItem value="Working from home">🏠 Working from Home</SelectItem>
                <SelectItem value="On vacation">✈️ On Vacation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {existingEntry && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
            
            <div className="flex gap-2 sm:ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading 
                  ? (existingEntry ? 'Updating...' : 'Adding...') 
                  : (existingEntry ? 'Update Status' : 'Add Status')
                }
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
