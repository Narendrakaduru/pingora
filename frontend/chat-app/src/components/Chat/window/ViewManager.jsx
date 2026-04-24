import React from 'react';
import ProfileView from '../../Profile/ProfileView';
import UsersView from '../../Users/UsersView';
import CalendarView from '../../Calendar/CalendarView';
import GroupsView from '../../Groups/GroupsView';
import SettingsView from '../../Settings/SettingsView';
import HomeView from '../../Home/HomeView';
import StatusView from '../../Status/StatusView';

const ViewManager = ({ 
  activeView, setActiveView, 
  onMessageUser, onMessageGroup, 
  handleEventCreated, allUsers,
  getUser,
  user
}) => {
  return (
    <div className="flex-1 overflow-hidden">
      {activeView === 'status' && (
        <StatusView user={user} onBack={() => setActiveView('chat')} />
      )}
      {activeView === 'profile' && (
        <ProfileView onBack={() => setActiveView('chat')} />
      )}
      {activeView === 'contacts' && (
        <UsersView onMessageUser={onMessageUser} />
      )}
      {activeView === 'calendar' && (
        <CalendarView onEventCreated={handleEventCreated} />
      )}
      {activeView === 'groups' && (
        <GroupsView onMessageGroup={onMessageGroup} getUser={getUser} />
      )}
      {activeView === 'settings' && (
        <SettingsView onBack={() => setActiveView('chat')} allUsers={allUsers} />
      )}
      {activeView === 'home' && (
        <HomeView onNavigate={(v) => setActiveView(v)} />
      )}
    </div>
  );
};

export default ViewManager;
