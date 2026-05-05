import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Timeline from './components/Timeline';
import ProjectsScreen from './components/ProjectsScreen';
import './App.css';

type AppView = 'timeline' | 'projects';

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [activeView, setActiveView] = useState<AppView>('timeline');

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="App">
      {activeView === 'timeline' ? (
        <Timeline onNavigateToProjects={() => setActiveView('projects')} />
      ) : (
        <ProjectsScreen onNavigateToTimeline={() => setActiveView('timeline')} />
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
