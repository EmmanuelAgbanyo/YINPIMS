import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Calendar,
  CalendarDays,
  TrendingUp,
  UserPlus,
  CalendarPlus,
  Download,
  Send,
  AlertTriangle,
  ArrowRight,
  Clock,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface DashboardProps {
  onNavigateTab: (tab: any) => void;
  onOpenCreateEvent: () => void;
  onOpenRegisterParticipant: () => void;
  onOpenExport: () => void;
  onOpenSendReminder: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigateTab,
  onOpenCreateEvent,
  onOpenRegisterParticipant,
  onOpenExport,
  onOpenSendReminder,
}) => {
  const { data, selectedEventId } = useApp();

  // Filter events based on selected event scope
  const filteredEvents = selectedEventId === 'all'
    ? data.events
    : data.events.filter(e => e.id === selectedEventId);

  const filteredRegistrations = selectedEventId === 'all'
    ? data.registrations
    : data.registrations.filter(r => r.eventId === selectedEventId);

  // Stats Calculations
  const totalParticipants = selectedEventId === 'all'
    ? data.participants.length
    : new Set(filteredRegistrations.map(r => r.participantId)).size;

  const totalEventsCount = filteredEvents.length;

  const upcomingEventsCount = filteredEvents.filter(e => {
    const today = new Date().toISOString().split('T')[0];
    return e.status === 'Active' && e.startDate >= today;
  }).length;

  const totalConfirmed = filteredRegistrations.filter(r => r.status === 'Confirmed').length;
  const totalCheckedIn = filteredRegistrations.filter(r => r.checkInStatus === 'Checked In').length;
  const attendanceRate = totalConfirmed > 0 ? Math.round((totalCheckedIn / totalConfirmed) * 100) : 0;

  // Featured Operational Insight calculation
  const getFeaturedInsight = () => {
    // 1. Check for waitlist
    const waitlistedRegs = filteredRegistrations.filter(r => r.status === 'Waitlisted');
    if (waitlistedRegs.length > 0) {
      const targetEvent = data.events.find(e => e.id === waitlistedRegs[0].eventId);
      return {
        title: 'Active Waitlist Growth',
        description: `${waitlistedRegs.length} participant(s) are currently on the waitlist for "${targetEvent?.name || 'Event'}". Consider expanding capacity or promoting next in queue.`,
        badge: 'Waitlist Alert',
        severity: 'warning' as const,
        action: () => onNavigateTab('participants'),
      };
    }

    // 2. Check for capacity threshold
    for (const evt of filteredEvents) {
      if (evt.capacity && evt.status === 'Active') {
        const regsCount = data.registrations.filter(r => r.eventId === evt.id && r.status === 'Confirmed').length;
        const fillRate = (regsCount / evt.capacity) * 100;
        if (fillRate >= 80) {
          return {
            title: 'Event Approaching Full Capacity',
            description: `"${evt.name}" has reached ${regsCount}/${evt.capacity} registered capacity (${Math.round(fillRate)}%).`,
            badge: 'Capacity Alert',
            severity: 'warning' as const,
            action: () => onNavigateTab('events'),
          };
        }
      }
    }

    // 3. Next upcoming event
    const upcoming = filteredEvents
      .filter(e => e.status === 'Active')
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];

    if (upcoming) {
      return {
        title: 'Upcoming Scheduled Event',
        description: `Next event: "${upcoming.name}" starts on ${new Date(upcoming.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at ${upcoming.location}.`,
        badge: 'Operational Focus',
        severity: 'info' as const,
        action: () => onNavigateTab('events'),
      };
    }

    return {
      title: 'Operational Status Normal',
      description: 'All event schedules and registration forms are functioning smoothly.',
      badge: 'System Ready',
      severity: 'info' as const,
      action: () => onNavigateTab('events'),
    };
  };

  const insight = getFeaturedInsight();

  // Participation chart data over recent dates/months
  const chartData = [
    { name: 'May', Registrations: 12, CheckIns: 8 },
    { name: 'Jun', Registrations: 28, CheckIns: 18 },
    { name: 'Jul', Registrations: 42, CheckIns: 25 },
    { name: 'Aug', Registrations: 65, CheckIns: 48 },
    { name: 'Sep', Registrations: totalConfirmed, CheckIns: totalCheckedIn },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1C1C1A] tracking-tight">
            Operational Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-[#6B6B66] mt-0.5">
            Real-time participant oversight, attendance metrics, and event actions.
          </p>
        </div>

        {/* Quick Actions Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenRegisterParticipant}
            className="flex items-center space-x-1.5 h-9 px-3 bg-[#14595A] text-white text-xs font-medium rounded-md hover:bg-[#0E4243] transition-colors shadow-2xs cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Participant</span>
          </button>
          <button
            onClick={onOpenCreateEvent}
            className="flex items-center space-x-1.5 h-9 px-3 bg-white border border-[#E4E4E1] text-[#1C1C1A] text-xs font-medium rounded-md hover:bg-[#FAFAF9] transition-colors cursor-pointer"
          >
            <CalendarPlus className="h-4 w-4 text-[#14595A]" />
            <span>Create Event</span>
          </button>
          <button
            onClick={onOpenExport}
            className="flex items-center space-x-1.5 h-9 px-3 bg-white border border-[#E4E4E1] text-[#1C1C1A] text-xs font-medium rounded-md hover:bg-[#FAFAF9] transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4 text-[#6B6B66]" />
            <span>Export Data</span>
          </button>
          <button
            onClick={onOpenSendReminder}
            className="flex items-center space-x-1.5 h-9 px-3 bg-white border border-[#E4E4E1] text-[#1C1C1A] text-xs font-medium rounded-md hover:bg-[#FAFAF9] transition-colors cursor-pointer"
          >
            <Send className="h-4 w-4 text-[#6B6B66]" />
            <span>Send Reminder</span>
          </button>
        </div>
      </div>

      {/* Summary Statistics Grid (4 Key Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-4 rounded-lg border border-[#E4E4E1] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#6B6B66]">Total Participants</span>
            <div className="text-2xl font-bold font-heading text-[#1C1C1A] mt-1 tabular-nums">
              {totalParticipants.toLocaleString()}
            </div>
            <span className="text-[11px] text-[#2F7D4F] font-medium flex items-center mt-1">
              Confirmed profiles across system
            </span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-[#14595A]/10 text-[#14595A] flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-4 rounded-lg border border-[#E4E4E1] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#6B6B66]">Total Events</span>
            <div className="text-2xl font-bold font-heading text-[#1C1C1A] mt-1 tabular-nums">
              {totalEventsCount}
            </div>
            <span className="text-[11px] text-[#6B6B66] font-medium flex items-center mt-1">
              Active & past programs
            </span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-[#14595A]/10 text-[#14595A] flex items-center justify-center">
            <Calendar className="h-5 w-5" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-4 rounded-lg border border-[#E4E4E1] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#6B6B66]">Upcoming Events</span>
            <div className="text-2xl font-bold font-heading text-[#1C1C1A] mt-1 tabular-nums">
              {upcomingEventsCount}
            </div>
            <span className="text-[11px] text-[#C17F16] font-medium flex items-center mt-1">
              Scheduled on calendar
            </span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-[#C17F16]/10 text-[#C17F16] flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-4 rounded-lg border border-[#E4E4E1] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#6B6B66]">Attendance Rate</span>
            <div className="text-2xl font-bold font-heading text-[#1C1C1A] mt-1 tabular-nums">
              {attendanceRate}%
            </div>
            <span className="text-[11px] text-[#2F7D4F] font-medium flex items-center mt-1">
              {totalCheckedIn} checked in / {totalConfirmed} confirmed
            </span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-[#2F7D4F]/10 text-[#2F7D4F] flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Featured Insight Card */}
      <div className={`p-4 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        insight.severity === 'warning'
          ? 'bg-[#FDF9F0] border-[#C17F16]/30 text-[#1C1C1A]'
          : 'bg-[#EBF4F4] border-[#14595A]/20 text-[#1C1C1A]'
      }`}>
        <div className="flex items-start space-x-3">
          <div className={`h-9 w-9 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
            insight.severity === 'warning'
              ? 'bg-[#C17F16] text-white'
              : 'bg-[#14595A] text-white'
          }`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6B6B66]">
                {insight.badge}
              </span>
              <span className="text-xs font-bold text-[#1C1C1A]">• {insight.title}</span>
            </div>
            <p className="text-xs text-[#6B6B66] mt-0.5 leading-relaxed">
              {insight.description}
            </p>
          </div>
        </div>
        <button
          onClick={insight.action}
          className="self-end sm:self-auto flex items-center space-x-1 text-xs font-bold text-[#14595A] hover:underline cursor-pointer shrink-0"
        >
          <span>View Details</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Grid Layout: Participation Chart + Recent Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Participation Chart (2 columns) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-lg border border-[#E4E4E1] shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#1C1C1A] font-heading">
                Participation & Attendance Trends
              </h2>
              <p className="text-xs text-[#6B6B66]">
                Comparison between total registrations and verified check-ins over time.
              </p>
            </div>
            <div className="flex items-center space-x-4 text-xs font-medium">
              <div className="flex items-center space-x-1.5">
                <span className="h-3 w-3 rounded-xs bg-[#14595A]" />
                <span className="text-[#6B6B66]">Registrations</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="h-3 w-3 rounded-xs bg-[#2F7D4F]" />
                <span className="text-[#6B6B66]">Check-Ins</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14595A" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#14595A" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCheck" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2F7D4F" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2F7D4F" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E4E1" />
                <XAxis dataKey="name" stroke="#6B6B66" fontSize={11} tickLine={false} />
                <YAxis stroke="#6B6B66" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E4E4E1',
                    borderRadius: '6px',
                    fontSize: '12px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  }}
                />
                <Area type="monotone" dataKey="Registrations" stroke="#14595A" strokeWidth={2} fillOpacity={1} fill="url(#colorReg)" />
                <Area type="monotone" dataKey="CheckIns" stroke="#2F7D4F" strokeWidth={2} fillOpacity={1} fill="url(#colorCheck)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Events List (1 column) */}
        <div className="bg-white p-5 rounded-lg border border-[#E4E4E1] shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1C1C1A] font-heading">
              Recent Events
            </h2>
            <button
              onClick={() => onNavigateTab('events')}
              className="text-xs font-semibold text-[#14595A] hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="divide-y divide-[#E4E4E1]">
            {filteredEvents.slice(0, 4).map(event => {
              const eventRegs = data.registrations.filter(r => r.eventId === event.id && r.status === 'Confirmed');
              const checkedInCount = eventRegs.filter(r => r.checkInStatus === 'Checked In').length;

              return (
                <div key={event.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-bold text-[#1C1C1A] line-clamp-1" title={event.name}>
                      {event.name}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                      event.status === 'Active'
                        ? 'bg-[#F0F9F3] text-[#2F7D4F]'
                        : event.status === 'Completed'
                        ? 'bg-[#FAFAF9] text-[#6B6B66] border border-[#E4E4E1]'
                        : 'bg-[#FDF9F0] text-[#C17F16]'
                    }`}>
                      {event.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#6B6B66]">
                    <span className="flex items-center space-x-1">
                      <CalendarDays className="h-3.5 w-3.5 text-[#6B6B66]" />
                      <span>{new Date(event.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </span>

                    <span className="tabular-nums font-medium text-[#1C1C1A]">
                      {checkedInCount} / {eventRegs.length} Checked In
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
