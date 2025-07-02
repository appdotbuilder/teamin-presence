
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PresenceForm } from '@/components/PresenceForm';
import { Edit2, MapPin, Home, Plane } from 'lucide-react';
import type { DashboardData, User, PresenceEntry, PresenceStatus } from '../../../server/src/schema';

interface WeekCalendarProps {
  dashboardData: DashboardData;
  currentUser: User;
  onRefresh: () => void;
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const getStatusIcon = (status: PresenceStatus) => {
  switch (status) {
    case 'In office':
      return <MapPin className="h-3 w-3" />;
    case 'Working from home':
      return <Home className="h-3 w-3" />;
    case 'On vacation':
      return <Plane className="h-3 w-3" />;
  }
};

const getStatusColor = (status: PresenceStatus) => {
  switch (status) {
    case 'In office':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'Working from home':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'On vacation':
      return 'bg-purple-100 text-purple-800 border-purple-200';
  }
};

export function WeekCalendar({ dashboardData, currentUser, onRefresh }: WeekCalendarProps) {
  const [editingEntry, setEditingEntry] = useState<{ user: User; date: Date; entry?: PresenceEntry } | null>(null);

  const getWeekDates = () => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(dashboardData.week_start);
      date.setDate(dashboardData.week_start.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const getPresenceForUserAndDate = (userId: number, date: Date): PresenceEntry | undefined => {
    return dashboardData.presence_entries.find((entry: PresenceEntry) => 
      entry.user_id === userId && 
      entry.date.toDateString() === date.toDateString()
    );
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const canEditEntry = (userId: number) => {
    return currentUser.role === 'Manager' || currentUser.id === userId;
  };

  const weekDates = getWeekDates();

  // Show placeholder message if no users or entries
  if (dashboardData.users.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">No team members found</p>
        <p className="text-sm text-gray-400">
          {currentUser.role === 'Manager' 
            ? 'Team members will appear here once they register and add presence entries.'
            : 'Contact your manager to add team members to the system.'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Week Header */}
      <div className="grid grid-cols-8 gap-2 mb-4">
        <div className="font-medium text-sm text-gray-600 py-2">Team</div>
        {weekDates.map((date: Date, index: number) => (
          <div key={index} className="text-center py-2">
            <div className="font-medium text-sm text-gray-900">{WEEKDAYS[index].slice(0, 3)}</div>
            <div className="text-xs text-gray-500">{date.getDate()}</div>
          </div>
        ))}
      </div>

      {/* User Rows */}
      <div className="space-y-2">
        {dashboardData.users.map((user: User) => (
          <Card key={user.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="grid grid-cols-8 gap-2 items-center">
                {/* User Info */}
                <div className="p-4 border-r border-gray-100">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getUserInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {user.name}
                      </div>
                      <div className="text-xs text-gray-500">{user.role}</div>
                    </div>
                  </div>
                </div>

                {/* Daily Status Cells */}
                {weekDates.map((date: Date, dayIndex: number) => {
                  const entry = getPresenceForUserAndDate(user.id, date);
                  const canEdit = canEditEntry(user.id);
                  
                  return (
                    <div key={dayIndex} className="p-2 text-center min-h-[60px] flex items-center justify-center">
                      {entry ? (
                        <div className="w-full">
                          <Badge 
                            className={`text-xs px-2 py-1 ${getStatusColor(entry.status)} w-full justify-center`}
                          >
                            <span className="flex items-center gap-1">
                              {getStatusIcon(entry.status)}
                              <span className="truncate">{entry.status}</span>
                            </span>
                          </Badge>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setEditingEntry({ user, date, entry })}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="w-full">
                          <div className="text-xs text-gray-400">—</div>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 mt-1 opacity-50 hover:opacity-100 transition-opacity"
                              onClick={() => setEditingEntry({ user, date })}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-200 text-sm">
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor('In office')}>
            <MapPin className="h-3 w-3 mr-1" />
            In Office
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor('Working from home')}>
            <Home className="h-3 w-3 mr-1" />
            Working from Home
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor('On vacation')}>
            <Plane className="h-3 w-3 mr-1" />
            On Vacation
          </Badge>
        </div>
      </div>

      {/* Edit Modal */}
      {editingEntry && (
        <PresenceForm
          user={editingEntry.user}
          dashboardData={dashboardData}
          initialDate={editingEntry.date}
          existingEntry={editingEntry.entry}
          onClose={() => setEditingEntry(null)}
          onUpdate={() => {
            setEditingEntry(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
