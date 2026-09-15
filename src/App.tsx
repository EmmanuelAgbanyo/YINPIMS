import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import type { NavTab } from './components/layout/Sidebar';
import { MobileNavDrawer } from './components/layout/MobileNavDrawer';
import { CommandPaletteModal } from './components/common/CommandPaletteModal';

import { Dashboard } from './components/dashboard/Dashboard';
import { EventList } from './components/events/EventList';
import { EventModal } from './components/events/EventModal';
import { FormBuilder } from './components/builder/FormBuilder';
import { ParticipantList } from './components/participants/ParticipantList';
import { AccommodationView } from './components/accommodation/AccommodationView';
import { CheckInView } from './components/checkin/CheckInView';
import { CommunicationsView } from './components/communications/CommunicationsView';
import { PostEventReportView } from './components/reports/PostEventReportView';
import { TeamAccessView } from './components/team/TeamAccessView';
import { SettingsView } from './components/settings/SettingsView';

import { PublicRegistrationModal } from './components/registration/PublicRegistrationModal';
import { CommunicationModal } from './components/communications/CommunicationModal';
import { ExportModal } from './components/reports/ExportModal';
import { CloudSyncModal } from './components/common/CloudSyncModal';
import { AuthModal } from './components/auth/AuthModal';
import type { Event } from './types';

const MainLayout: React.FC = () => {
  const { activeRole } = useApp();
  const [activeTab, setActiveTab] = useState<NavTab>('overview');

  // Navigation Collapse & Drawer State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Modals state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerEventId, setRegisterEventId] = useState<string | undefined>(undefined);

  const [isCommModalOpen, setIsCommModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [formBuilderEventId, setFormBuilderEventId] = useState<string | undefined>(undefined);

  // Global Keyboard Shortcut Listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto fallback if role is changed to CHECKIN_STAFF and on forbidden page
  useEffect(() => {
    if (activeRole === 'CHECKIN_STAFF' && ['form-builder', 'team', 'settings'].includes(activeTab)) {
      setActiveTab('checkin');
    }
  }, [activeRole, activeTab]);

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col font-body text-[#1C1C1A]">
      {/* Top Header */}
      <Header
        onOpenCheckIn={() => setActiveTab('checkin')}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onToggleMobileDrawer={() => setIsMobileDrawerOpen(prev => !prev)}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebarCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Body Area */}
      <div className="flex flex-1">
        {/* Left Collapsible Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 pb-12">
          {activeTab === 'overview' && (
            <Dashboard
              onNavigateTab={setActiveTab}
              onOpenCreateEvent={() => {
                setEditingEvent(null);
                setIsEventModalOpen(true);
              }}
              onOpenRegisterParticipant={() => {
                setRegisterEventId(undefined);
                setIsRegisterModalOpen(true);
              }}
              onOpenExport={() => setIsExportModalOpen(true)}
              onOpenSendReminder={() => setIsCommModalOpen(true)}
            />
          )}

          {activeTab === 'events' && (
            <EventList
              onOpenCreate={() => {
                setEditingEvent(null);
                setIsEventModalOpen(true);
              }}
              onEditEvent={evt => {
                setEditingEvent(evt);
                setIsEventModalOpen(true);
              }}
              onOpenFormBuilder={evtId => {
                setFormBuilderEventId(evtId);
                setActiveTab('form-builder');
              }}
              onOpenRegister={evtId => {
                setRegisterEventId(evtId);
                setIsRegisterModalOpen(true);
              }}
            />
          )}

          {activeTab === 'form-builder' && (
            <FormBuilder initialEventId={formBuilderEventId} />
          )}

          {activeTab === 'participants' && (
            <ParticipantList
              onRegisterNew={() => {
                setRegisterEventId(undefined);
                setIsRegisterModalOpen(true);
              }}
            />
          )}

          {activeTab === 'accommodation' && <AccommodationView />}

          {activeTab === 'checkin' && <CheckInView />}

          {activeTab === 'communications' && <CommunicationsView />}

          {activeTab === 'reports' && <PostEventReportView />}

          {activeTab === 'team' && <TeamAccessView />}

          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Mobile Navigation Drawer */}
      <MobileNavDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Quick Command Palette Search Modal */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigateTab={setActiveTab}
      />

      {/* Global Modals */}
      {isEventModalOpen && (
        <EventModal
          isOpen={isEventModalOpen}
          onClose={() => {
            setIsEventModalOpen(false);
            setEditingEvent(null);
          }}
          initialEvent={editingEvent}
        />
      )}

      {isRegisterModalOpen && (
        <PublicRegistrationModal
          isOpen={isRegisterModalOpen}
          onClose={() => setIsRegisterModalOpen(false)}
          eventId={registerEventId}
        />
      )}

      {isCommModalOpen && (
        <CommunicationModal
          isOpen={isCommModalOpen}
          onClose={() => setIsCommModalOpen(false)}
        />
      )}

      {isExportModalOpen && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}

      {/* Firebase Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Cross-Device Multi-Device Cloud Sync Modal */}
      <CloudSyncModal />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}

export default App;
