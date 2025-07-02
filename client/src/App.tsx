
import { useState, useEffect, useCallback } from 'react';
import { AuthForm } from '@/components/AuthForm';
import { Dashboard } from '@/components/Dashboard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LogOut, Calendar, Users } from 'lucide-react';
import type { User } from '../../server/src/schema';

interface AuthData {
  user: User;
  token: string;
}

function App() {
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize authentication from localStorage
  useEffect(() => {
    const savedAuth = localStorage.getItem('teamin_auth');
    if (savedAuth) {
      try {
        const parsed = JSON.parse(savedAuth);
        setAuthData(parsed);
      } catch {
        localStorage.removeItem('teamin_auth');
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogin = useCallback((userData: AuthData) => {
    setAuthData(userData);
    localStorage.setItem('teamin_auth', JSON.stringify(userData));
  }, []);

  const handleLogout = useCallback(() => {
    setAuthData(null);
    localStorage.removeItem('teamin_auth');
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading TeamIn...</p>
        </div>
      </div>
    );
  }

  if (!authData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Calendar className="h-8 w-8 text-blue-600 mr-2" />
              <h1 className="text-3xl font-bold text-gray-900">TeamIn</h1>
            </div>
            <p className="text-gray-600">Team presence management made simple</p>
          </div>
          <AuthForm onLogin={handleLogin} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">TeamIn</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Card className="py-1 px-3">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">{authData.user.name}</span>
                  <Badge variant={authData.user.role === 'Manager' ? 'default' : 'secondary'}>
                    {authData.user.role}
                  </Badge>
                </div>
              </Card>
              
              <Separator orientation="vertical" className="h-6" />
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Dashboard user={authData.user} />
      </main>
    </div>
  );
}

export default App;
