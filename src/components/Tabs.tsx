'use client';

import { useState } from 'react';
import UsersTab from './UsersTab';
import OrganizationsTab from './OrganizationsTab';
import GroupsTab from './GroupsTab';
import FoldersTab from './FoldersTab';
import KahootsTab from './KahootsTab';

const Tabs = () => {
  const [activeTab, setActiveTab] = useState('Users');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Users':
        return <UsersTab />;
      case 'Organizations':
        return <OrganizationsTab />;
      case 'Groups':
        return <GroupsTab />;
      case 'Folders':
        return <FoldersTab />;
      case 'Kahoots':
        return <KahootsTab />;
      default:
        return null;
    }
  };

  const tabStyles = "py-3 px-6 font-semibold text-gray-600 rounded-t-lg transition-all duration-300 ease-in-out focus:outline-none";
  const activeTabStyles = "bg-white border-b-4 border-blue-600 text-blue-600";
  const inactiveTabStyles = "hover:bg-gray-100 hover:text-gray-800";

  return (
    <div className="w-full">
      <div className="flex border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <button onClick={() => setActiveTab('Users')} className={`${tabStyles} ${activeTab === 'Users' ? activeTabStyles : inactiveTabStyles}`}>Users</button>
        <button onClick={() => setActiveTab('Organizations')} className={`${tabStyles} ${activeTab === 'Organizations' ? activeTabStyles : inactiveTabStyles}`}>Organizations</button>
        <button onClick={() => setActiveTab('Groups')} className={`${tabStyles} ${activeTab === 'Groups' ? activeTabStyles : inactiveTabStyles}`}>Groups</button>
        <button onClick={() => setActiveTab('Folders')} className={`${tabStyles} ${activeTab === 'Folders' ? activeTabStyles : inactiveTabStyles}`}>Folders</button>
        <button onClick={() => setActiveTab('Kahoots')} className={`${tabStyles} ${activeTab === 'Kahoots' ? activeTabStyles : inactiveTabStyles}`}>Kahoots</button>
      </div>
      <div className="p-6 bg-white rounded-b-lg">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default Tabs;