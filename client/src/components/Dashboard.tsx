
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { WeekCalendar } from '@/components/WeekCalendar';
import { PresenceForm } from '@/components/PresenceForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronLeft, ChevronRight, Plus, AlertCircle } from 'lucide-react';
import type { User, DashboardData, GetDashboardDataInput } from '../../../server/src/schema';

interface DashboardProps {
  user: User;
}

export function Dashboard({ user }: DashboardProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Sunday (0) and Monday (1)
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPresenceForm, setShowPresenceForm] = useState(false);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const input: GetDashboardDataInput = {
        week_start: currentWeekStart
      };
      const data = await trpc.getDashboardData.query(input);
      setDashboardData(data);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard data';
      setError(errorMessage);
      console.error('Dashboard load error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentWeekStart]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const navigateWeek = useCallback((direction: 'prev' | 'next') => {
    setCurrentWeekStart((prev: Date) => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + (direction === 'next' ? 7 : -7));
      return newDate;
    });
  }, []);

  const formatWeekRange = (startDate: Date, endDate: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric',
      year: startDate.getFullYear() !== endDate.getFullYear() ? 'numeric' : undefined
    };
    
    const startStr = startDate.toLocaleDateString('en-US', options);
    const endStr = endDate.toLocaleDateString('en-US', options);
    
    return `${startStr} - ${endStr}`;
  };

  const handlePresenceUpdate = useCallback(() => {
    setShowPresenceForm(false);
    loadDashboardData(); // Refresh dashboard data
  }, [loadDashboardData]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Team Presence Dashboard</h2>
          <p className="text-gray-600 mt-1">
            {user.role === 'Manager' 
              ? 'Manage your team\'s presence status' 
              : 'View team status and manage your own presence'
            }
          </p>
        </div>
        
        <Button 
          onClick={() => setShowPresenceForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {user.role === 'Manager' ? 'Add Team Status' : 'Update My Status'}
        </Button>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">
                Week of {dashboardData ? formatWeekRange(dashboardData.week_start, dashboardData.week_end) : 'Loading...'}
              </CardTitle>
              <CardDescription>
                Team presence overview for the selected week
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('prev')}
                disabled={isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm" 
                onClick={() => navigateWeek('next')}
                disabled={isLoading}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Loading week data...</p>
              </div>
            </div>
          ) : dashboardData ? (
            <WeekCalendar
              dashboardData={dashboardData}
              currentUser={user}
              onRefresh={loadDashboardData}
            />
          ) : (
            <div className="text-center py-12 text-gray-500">
              No data available for this week
            </div>
          )}
        </CardContent>
      </Card>

      {/* Presence Form Modal */}
      {showPresenceForm && (
        <PresenceForm
          user={user}
          dashboardData={dashboardData}
          onClose={() => setShowPresenceForm(false)}
          onUpdate={handlePresenceUpdate}
        />
      )}
    </div>
  );
}
