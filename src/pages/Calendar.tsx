import { useState, useMemo, useCallback, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Plus, Video, MapPin,
  Clock, X, Calendar as CalendarIcon, List, Grid3X3, Edit, AlertCircle, Loader2, Trash2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths,
  addWeeks, subWeeks, addDays, subDays, isToday, eachHourOfInterval,
  setHours, setMinutes
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';
import Layout from '../components/Layout';
import { Appointment } from '../types';

type ViewMode = 'month' | 'week' | 'day';
type CalendarItemsMode = 'all' | 'sessions' | 'custom';
type AddEntryType = 'session' | 'custom';
type CustomEventType = 'supervision' | 'seminar' | 'group_supervision' | 'intervision';
const isCustomEvent = (apt: Appointment) => apt.kind === 'custom' || !apt.clientId;
const getCustomEventType = (apt: Appointment): CustomEventType => {
  const raw = (apt.customType || 'seminar') as CustomEventType;
  if (raw === 'supervision' || raw === 'seminar' || raw === 'group_supervision' || raw === 'intervision') {
    return raw;
  }
  return 'seminar';
};

export default function Calendar() {
  const { appointments, clients, addAppointment, updateAppointment, deleteAppointment, ensureSessionForAppointment } = useApp();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const dateLocale = language === 'en' ? enUS : ru;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [itemsMode, setItemsMode] = useState<CalendarItemsMode>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [navigatingId, setNavigatingId] = useState<string | null>(null);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [newApt, setNewApt] = useState({
    entryType: 'session' as AddEntryType,
    customType: 'supervision' as CustomEventType,
    customTitle: '',
    clientId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '10:00',
    duration: 50,
    isOnline: true,
    meetingLink: '',
  });

  const goToPrev = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };
  const goToNext = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };
  const goToToday = () => { setCurrentDate(new Date()); setSelectedDate(new Date()); };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const dayHours = eachHourOfInterval({
    start: setMinutes(setHours(currentDate, 8), 0),
    end: setMinutes(setHours(currentDate, 21), 0),
  });

  const eventTypeLabels: Record<CustomEventType, string> = {
    supervision: t('calendar_event_supervision'),
    seminar: t('calendar_event_seminar'),
    group_supervision: t('calendar_event_group_supervision'),
    intervision: t('calendar_event_intervision'),
  };

  const eventTypeColors: Record<CustomEventType, string> = {
    supervision: 'bg-violet-100 text-violet-800 border-l-4 border-violet-500',
    seminar: 'bg-amber-100 text-amber-800 border-l-4 border-amber-500',
    group_supervision: 'bg-emerald-100 text-emerald-800 border-l-4 border-emerald-500',
    intervision: 'bg-cyan-100 text-cyan-800 border-l-4 border-cyan-500',
  };

  const visibleAppointments = useMemo(() => {
    if (itemsMode === 'all') return appointments;
    if (itemsMode === 'sessions') return appointments.filter(a => !isCustomEvent(a));
    return appointments.filter(isCustomEvent);
  }, [appointments, itemsMode]);

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, typeof visibleAppointments> = {};
    visibleAppointments.forEach(apt => {
      if (!map[apt.date]) map[apt.date] = [];
      map[apt.date].push(apt);
    });
    Object.keys(map).forEach(k => map[k].sort((a, b) => a.time.localeCompare(b.time)));
    return map;
  }, [visibleAppointments]);

  const selectedDateAppointments = useMemo(() => {
    if (!selectedDate) return [];
    return (appointmentsByDate[format(selectedDate, 'yyyy-MM-dd')] || [])
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [selectedDate, appointmentsByDate]);

  const weekDayNames = [t('day_mon'), t('day_tue'), t('day_wed'), t('day_thu'), t('day_fri'), t('day_sat'), t('day_sun')];

  const checkConflict = (date: string, time: string, duration: number, excludeId?: string): boolean => {
    const [fH, fM] = time.split(':').map(Number);
    const fStart = fH * 60 + fM;
    const fEnd = fStart + duration;
    return appointments.some(a => {
      if (excludeId && a.id === excludeId) return false;
      if (a.date !== date) return false;
      const [aH, aM] = a.time.split(':').map(Number);
      const aStart = aH * 60 + aM;
      const aEnd = aStart + a.duration;
      return fStart < aEnd && fEnd > aStart;
    });
  };

  const canSubmit = newApt.entryType === 'session'
    ? !!newApt.clientId
    : !!newApt.customTitle.trim();

  const hasConflict = canSubmit
    ? checkConflict(newApt.date, newApt.time, newApt.duration, editingAppointmentId || undefined)
    : false;

  const resetNewApt = () => {
    setNewApt({
      entryType: 'session',
      customType: 'supervision',
      customTitle: '',
      clientId: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: '10:00',
      duration: 50,
      isOnline: true,
      meetingLink: '',
    });
    setEditingAppointmentId(null);
  };

  const handleSaveAppointment = async () => {
    if (hasConflict) return;

    if (editingAppointmentId) {
      if (newApt.entryType === 'custom') {
        await updateAppointment(editingAppointmentId, {
          clientName: newApt.customTitle.trim(),
          date: newApt.date,
          time: newApt.time,
          duration: newApt.duration,
          kind: 'custom',
          customType: newApt.customType,
          isOnline: false,
          meetingLink: undefined,
        });
      } else {
        const client = clients.find(c => c.id === newApt.clientId);
        if (!client) return;
        await updateAppointment(editingAppointmentId, {
          clientId: newApt.clientId,
          clientName: client.name,
          date: newApt.date,
          time: newApt.time,
          duration: newApt.duration,
          kind: 'session',
          isOnline: newApt.isOnline,
          meetingLink: newApt.isOnline ? (newApt.meetingLink || client.meetingLink) : undefined,
        });
      }
      setShowAddModal(false);
      resetNewApt();
      return;
    }

    if (newApt.entryType === 'custom') {
      await addAppointment({
        clientId: undefined,
        clientName: newApt.customTitle.trim(),
        date: newApt.date,
        time: newApt.time,
        duration: newApt.duration,
        status: 'scheduled',
        isOnline: false,
        kind: 'custom',
        customType: newApt.customType,
      });
      setShowAddModal(false);
      resetNewApt();
      return;
    }

    const client = clients.find(c => c.id === newApt.clientId);
    if (!client) return;

    await addAppointment({
      clientId: newApt.clientId,
      clientName: client.name,
      date: newApt.date,
      time: newApt.time,
      duration: newApt.duration,
      status: 'scheduled',
      isOnline: newApt.isOnline,
      meetingLink: newApt.isOnline ? (newApt.meetingLink || client.meetingLink) : undefined,
      kind: 'session',
    });

    setShowAddModal(false);
    resetNewApt();
  };

  const openAddModal = (date?: Date) => {
    const d = date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
    setNewApt(prev => ({
      ...prev,
      date: d,
      clientId: '',
      customTitle: '',
      entryType: 'session',
      customType: 'supervision',
    }));
    setEditingAppointmentId(null);
    setShowAddModal(true);
  };

  const openEditModal = (apt: Appointment) => {
    const custom = isCustomEvent(apt);
    setEditingAppointmentId(apt.id);
    setNewApt({
      entryType: custom ? 'custom' : 'session',
      customType: custom ? getCustomEventType(apt) : 'supervision',
      customTitle: custom ? apt.clientName : '',
      clientId: custom ? '' : (apt.clientId || ''),
      date: apt.date,
      time: apt.time,
      duration: apt.duration,
      isOnline: custom ? false : apt.isOnline,
      meetingLink: custom ? '' : (apt.meetingLink || ''),
    });
    setShowAddModal(true);
  };

  const handleDeleteCustomAppointment = async (appointmentId: string) => {
    await deleteAppointment(appointmentId);
    if (editingAppointmentId === appointmentId) {
      setShowAddModal(false);
      resetNewApt();
    }
  };

  const getAppointmentsForHour = (day: Date, hour: number) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const hourStr = hour.toString().padStart(2, '0');
    return (appointmentsByDate[dateKey] || []).filter(a => a.time.startsWith(hourStr));
  };

  const getHeaderTitle = () => {
    if (viewMode === 'month') return format(currentDate, 'LLLL yyyy', { locale: dateLocale });
    if (viewMode === 'week') return `${format(weekStart, 'd MMM', { locale: dateLocale })} — ${format(weekEnd, 'd MMM yyyy', { locale: dateLocale })}`;
    return format(currentDate, 'd MMMM yyyy, EEEE', { locale: dateLocale });
  };

  const handleAptClick = useCallback(async (apt: Appointment) => {
    if (isCustomEvent(apt) || navigatingId) return;
    if (!apt.clientId) return;
    setNavigatingId(apt.id);
    try {
      const sessionId = await ensureSessionForAppointment(apt);
      if (sessionId) {
        navigate(`/clients/${apt.clientId}/sessions/${sessionId}`);
      }
    } finally {
      setNavigatingId(null);
    }
  }, [ensureSessionForAppointment, navigate, navigatingId]);

  const handleEditApt = useCallback(async (e: MouseEvent, apt: Appointment) => {
    e.stopPropagation();
    if (isCustomEvent(apt) || navigatingId) return;
    if (!apt.clientId) return;
    setNavigatingId(apt.id + '_edit');
    try {
      const sessionId = await ensureSessionForAppointment(apt);
      if (sessionId) {
        navigate(`/clients/${apt.clientId}/sessions/${sessionId}/edit`);
      }
    } finally {
      setNavigatingId(null);
    }
  }, [ensureSessionForAppointment, navigate, navigatingId]);

  const renderAptCard = (apt: Appointment, compact = false) => {
    const isNavigating = navigatingId === apt.id || navigatingId === apt.id + '_edit';
    const custom = isCustomEvent(apt);
    const customType = custom ? getCustomEventType(apt) : null;
    const statusColors = {
      scheduled: 'bg-blue-100 text-blue-800 border-l-4 border-blue-500',
      completed:  'bg-green-100 text-green-800 border-l-4 border-green-500',
      cancelled:  'bg-red-100 text-red-800 border-l-4 border-red-500',
      'no-show':  'bg-yellow-100 text-yellow-800 border-l-4 border-yellow-500',
    };

    return (
      <div
        key={apt.id}
        onClick={custom ? undefined : (e => { e.stopPropagation(); handleAptClick(apt); })}
        className={`rounded-lg transition-all ${custom ? '' : 'cursor-pointer hover:scale-[1.02] active:scale-95'} ${compact ? 'p-1.5' : 'p-3'} ${custom ? eventTypeColors[customType!] : (statusColors[apt.status as keyof typeof statusColors] || 'bg-gray-100')} ${isNavigating ? 'opacity-60' : ''}`}
      >
        <div className={`font-medium truncate flex items-center gap-1 ${compact ? 'text-xs' : 'text-sm'}`}>
          {isNavigating && <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />}
          {apt.clientName}
        </div>
        <div className={`flex items-center gap-1.5 mt-0.5 ${compact ? 'text-[10px]' : 'text-xs'} opacity-80`}>
          <Clock className={compact ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />
          {apt.time} · {apt.duration}{t('minutes')}
          {!custom && (apt.isOnline
            ? <Video className={compact ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />
            : <MapPin className={compact ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />
          )}
        </div>
        {!compact && custom && (
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="text-xs font-medium opacity-90 truncate">
              {eventTypeLabels[customType!]}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={e => { e.stopPropagation(); openEditModal(apt); }}
                className="inline-flex items-center gap-1 px-2 py-1 bg-white/60 rounded text-xs font-medium hover:bg-white/90"
              >
                <Edit className="w-3 h-3" />
                {t('edit')}
              </button>
              <button
                onClick={e => { e.stopPropagation(); handleDeleteCustomAppointment(apt.id); }}
                className="inline-flex items-center gap-1 px-2 py-1 bg-white/60 rounded text-xs font-medium hover:bg-red-50 text-red-600"
              >
                <Trash2 className="w-3 h-3" />
                {t('delete')}
              </button>
            </div>
          </div>
        )}
        {!compact && !custom && (
          <div className="flex items-center gap-2 mt-2">
            {apt.isOnline && apt.meetingLink && (
              <a href={apt.meetingLink} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="px-2 py-1 bg-white/60 rounded text-xs font-medium hover:bg-white/90">
                {t('open_record')}
              </a>
            )}
            <button
              onClick={e => handleEditApt(e, apt)}
              disabled={!!navigatingId}
              className="inline-flex items-center gap-1 px-2 py-1 bg-white/60 rounded text-xs font-medium hover:bg-white/90 disabled:opacity-50"
            >
              {navigatingId === apt.id + '_edit'
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Edit className="w-3 h-3" />
              }
              {t('edit')}
            </button>
          </div>
        )}
      </div>
    );
  };

  const activeClients = clients.filter(c => c.status === 'active');

  return (
    <Layout>
      <div className="max-w-7xl mx-auto animate-fadeIn">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl lg:text-3xl font-bold text-gray-900 dark:text-white">{t('calendar_title')}</h1>
            <p className="text-gray-500 text-sm">{t('today_schedule')}</p>
          </div>
          <button onClick={() => openAddModal()} className="btn-primary flex items-center gap-2 justify-center text-sm">
            <Plus className="w-4 h-4" /> {t('calendar_add_item')}
          </button>
        </div>

        {/* View Switcher */}
        <div className="card mb-5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1 w-full sm:w-auto">
                {([
                  { mode: 'day' as ViewMode,   icon: CalendarIcon, label: t('view_day') },
                  { mode: 'week' as ViewMode,  icon: List,         label: t('view_week') },
                  { mode: 'month' as ViewMode, icon: Grid3X3,      label: t('view_month') },
                ] as const).map(v => (
                  <button key={v.mode} onClick={() => setViewMode(v.mode)}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                      viewMode === v.mode ? 'bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                    }`}>
                    <v.icon className="w-4 h-4" /> {v.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <button onClick={goToToday} className="px-3 py-2 text-xs sm:text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
                  {t('go_today')}
                </button>
                <div className="flex items-center gap-1">
                  <button onClick={goToPrev} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white min-w-[140px] sm:min-w-[200px] text-center capitalize">
                    {getHeaderTitle()}
                  </h2>
                  <button onClick={goToNext} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1 w-full sm:w-fit">
                {([
                  { mode: 'all' as CalendarItemsMode, label: t('calendar_show_all') },
                  { mode: 'sessions' as CalendarItemsMode, label: t('calendar_show_sessions') },
                  { mode: 'custom' as CalendarItemsMode, label: t('calendar_show_custom') },
                ] as const).map(item => (
                  <button
                    key={item.mode}
                    onClick={() => setItemsMode(item.mode)}
                    className={`flex-1 sm:flex-none px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                      itemsMode === item.mode
                        ? 'bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> {t('calendar_show_sessions')}
                </span>
                <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-500" /> {t('calendar_custom_events')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* MONTH VIEW */}
        {viewMode === 'month' && (
          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 card p-3 sm:p-5">
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {weekDayNames.map(d => (
                  <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {monthDays.map(day => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const dayApts = appointmentsByDate[dateKey] || [];
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  return (
                    <button key={day.toString()}
                      onClick={() => setSelectedDate(day)}
                      onDoubleClick={() => openAddModal(day)}
                      className={`relative min-h-[60px] sm:min-h-[80px] p-1 sm:p-2 rounded-lg border-2 transition-all text-left ${
                        isSelected ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      } ${!isSameMonth(day, currentDate) ? 'opacity-30' : ''}`}
                    >
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                        isToday(day) ? 'bg-indigo-500 text-white' : 'dark:text-gray-200'
                      }`}>{format(day, 'd')}</span>
                      {dayApts.length > 0 && (
                        <div className="mt-0.5 space-y-0.5">
                          {dayApts.slice(0, 2).map(apt => {
                            const custom = isCustomEvent(apt);
                            const chipClass = custom
                              ? eventTypeColors[getCustomEventType(apt)].replace('border-l-4', '').replace('border-violet-500', '').replace('border-amber-500', '').replace('border-emerald-500', '').replace('border-cyan-500', '')
                              : (apt.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                                apt.status === 'completed' ? 'bg-green-100 text-green-700' :
                                apt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700');
                            return (
                              <div key={apt.id} className={`text-[9px] sm:text-xs px-1 py-0.5 rounded truncate ${chipClass}`}>
                                {apt.time} {apt.clientName.split(' ')[0]}
                              </div>
                            );
                          })}
                          {dayApts.length > 2 && (
                            <div className="text-[9px] sm:text-xs text-gray-500 px-1">+{dayApts.length - 2}</div>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Day Panel */}
            <div className="card h-fit lg:sticky lg:top-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                  {selectedDate ? format(selectedDate, 'd MMMM yyyy', { locale: dateLocale }) : t('today')}
                </h3>
                {selectedDate && (
                  <button onClick={() => openAddModal(selectedDate)} className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg text-indigo-600">
                    <Plus className="w-5 h-5" />
                  </button>
                )}
              </div>
              {selectedDateAppointments.length > 0 ? (
                <div className="space-y-3">{selectedDateAppointments.map(apt => renderAptCard(apt))}</div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">{t('no_appointments')}</p>
                  <button onClick={() => selectedDate && openAddModal(selectedDate)}
                    className="mt-3 text-indigo-600 text-sm font-medium hover:underline">
                    {t('add_appointment')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* WEEK VIEW */}
        {viewMode === 'week' && (
          <div className="card overflow-x-auto p-0">
            <div className="min-w-[640px] p-4">
              <div className="grid grid-cols-8 gap-1 pb-3 border-b dark:border-gray-700 mb-2">
                <div className="text-xs font-medium text-gray-400 pt-2">{t('time')}</div>
                {weekDays.map(day => (
                  <div key={day.toString()} className={`text-center ${isToday(day) ? 'text-indigo-600' : ''}`}>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{format(day, 'EEE', { locale: dateLocale })}</div>
                    <button
                      onClick={() => { setCurrentDate(day); setViewMode('day'); }}
                      className={`text-lg font-bold w-9 h-9 rounded-full mx-auto flex items-center justify-center ${
                        isToday(day) ? 'bg-indigo-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white'
                      }`}
                    >
                      {format(day, 'd')}
                    </button>
                  </div>
                ))}
              </div>
              <div className="space-y-0.5">
                {dayHours.map(hour => (
                  <div key={hour.toString()} className="grid grid-cols-8 gap-1 min-h-[52px]">
                    <div className="text-xs text-gray-400 pt-1 text-right pr-2">{format(hour, 'HH:00')}</div>
                    {weekDays.map(day => {
                      const hourApts = getAppointmentsForHour(day, hour.getHours());
                      return (
                        <div key={day.toString()}
                          onClick={() => { setCurrentDate(day); openAddModal(day); }}
                          className="border border-gray-100 dark:border-gray-700 rounded-lg p-1 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer min-h-[52px] space-y-0.5"
                        >
                          {hourApts.map(apt => renderAptCard(apt, true))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* DAY VIEW */}
        {viewMode === 'day' && (
          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 card">
              <div className="space-y-1">
                {dayHours.map(hour => {
                  const hourApts = getAppointmentsForHour(currentDate, hour.getHours());
                  return (
                    <div key={hour.toString()} className="flex gap-3 min-h-[72px]">
                      <div className="w-12 text-xs text-gray-400 pt-3 text-right flex-shrink-0">{format(hour, 'HH:00')}</div>
                      <div onClick={() => openAddModal(currentDate)}
                        className="flex-1 border border-gray-100 dark:border-gray-700 rounded-xl p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                        {hourApts.length > 0 ? (
                          <div className="space-y-2" onClick={e => e.stopPropagation()}>
                            {hourApts.map(apt => renderAptCard(apt))}
                          </div>
                        ) : (
                          <div className="h-full flex items-center text-gray-300 text-xs gap-1">
                            <Plus className="w-3.5 h-3.5" /> {t('add')}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card h-fit lg:sticky lg:top-8">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                {format(currentDate, 'd MMMM, EEEE', { locale: dateLocale })}
              </h3>
              {(() => {
                const dateKey = format(currentDate, 'yyyy-MM-dd');
                const dayApts = appointmentsByDate[dateKey] || [];
                const scheduled = dayApts.filter(a => !isCustomEvent(a) && a.status === 'scheduled').length;
                const completed = dayApts.filter(a => !isCustomEvent(a) && a.status === 'completed').length;
                const totalMin = dayApts.reduce((s, a) => s + a.duration, 0);
                const customCount = dayApts.filter(isCustomEvent).length;
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3 text-center">
                        <div className="text-2xl font-bold text-blue-600">{scheduled}</div>
                        <div className="text-xs text-blue-600">{t('status_scheduled')}</div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-3 text-center">
                        <div className="text-2xl font-bold text-green-600">{completed}</div>
                        <div className="text-xs text-green-600">{t('status_completed_session')}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-violet-50 dark:bg-violet-900/30 rounded-xl p-3 text-center">
                        <div className="text-2xl font-bold text-violet-600">{customCount}</div>
                        <div className="text-xs text-violet-600">{t('calendar_custom_events')}</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-center">
                        <div className="text-xl font-bold text-gray-700 dark:text-gray-200">
                          {Math.floor(totalMin / 60)}{t('hours')} {totalMin % 60}{t('minutes')}
                        </div>
                        <div className="text-xs text-gray-500">{t('total_hours')}</div>
                      </div>
                    </div>
                    {dayApts.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('today_schedule')}</h4>
                        <div className="space-y-2">
                          {dayApts.map(apt => {
                            const custom = isCustomEvent(apt);
                            return (
                              <button key={apt.id}
                                onClick={() => !custom && handleAptClick(apt)}
                                disabled={!!navigatingId || custom}
                                className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors text-left ${custom ? 'bg-violet-50 dark:bg-violet-900/20 cursor-default' : 'hover:bg-gray-100 dark:hover:bg-gray-700'} disabled:opacity-60`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 ${custom ? 'bg-violet-500' : 'bg-gradient-to-br from-indigo-500 to-purple-500'}`}>
                                  {custom
                                    ? '+'
                                    : (navigatingId === apt.id
                                      ? <Loader2 className="w-4 h-4 animate-spin" />
                                      : apt.clientName.charAt(0))
                                  }
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate dark:text-white">{apt.clientName}</p>
                                  <p className="text-xs text-gray-500">{apt.time} · {apt.duration} {t('minutes')}</p>
                                </div>
                                {custom && (
                                  <div className="flex items-center gap-1">
                                    <span
                                      onClick={e => { e.preventDefault(); e.stopPropagation(); openEditModal(apt); }}
                                      className="inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-white/70 text-gray-700 cursor-pointer"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </span>
                                    <span
                                      onClick={e => { e.preventDefault(); e.stopPropagation(); handleDeleteCustomAppointment(apt.id); }}
                                      className="inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-red-50 text-red-600 cursor-pointer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </span>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ADD MODAL */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 animate-slideUp max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {editingAppointmentId ? t('edit') : t('calendar_add_item')}
                </h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1 dark:bg-gray-700">
                <button
                  onClick={() => setNewApt(prev => ({ ...prev, entryType: 'session' }))}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${newApt.entryType === 'session' ? 'bg-white text-indigo-600 shadow dark:bg-gray-600 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-300'}`}
                >
                  {t('calendar_entry_session')}
                </button>
                <button
                  onClick={() => setNewApt(prev => ({ ...prev, entryType: 'custom' }))}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${newApt.entryType === 'custom' ? 'bg-white text-indigo-600 shadow dark:bg-gray-600 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-300'}`}
                >
                  {t('calendar_entry_custom')}
                </button>
              </div>

              {hasConflict && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {t('calendar_conflict_error')}
                </div>
              )}

              <div className="space-y-4">
                {newApt.entryType === 'session' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('select_client_label')} *</label>
                    {activeClients.length === 0 ? (
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl text-sm text-gray-500 text-center">
                        {t('no_clients_to_add')}
                      </div>
                    ) : (
                      <select value={newApt.clientId}
                        onChange={e => {
                          const c = clients.find(cl => cl.id === e.target.value);
                          setNewApt({ ...newApt, clientId: e.target.value, isOnline: c?.isOnline ?? true, meetingLink: c?.meetingLink || '' });
                        }}
                        className="input-field" required>
                        <option value="">{t('select_client')}</option>
                        {activeClients.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('calendar_custom_type')}</label>
                      <select
                        value={newApt.customType}
                        onChange={e => setNewApt({ ...newApt, customType: e.target.value as CustomEventType })}
                        className="input-field"
                      >
                        <option value="supervision">{t('calendar_event_supervision')}</option>
                        <option value="seminar">{t('calendar_event_seminar')}</option>
                        <option value="group_supervision">{t('calendar_event_group_supervision')}</option>
                        <option value="intervision">{t('calendar_event_intervision')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('calendar_custom_title')}</label>
                      <input
                        type="text"
                        value={newApt.customTitle}
                        onChange={e => setNewApt({ ...newApt, customTitle: e.target.value })}
                        className="input-field"
                        placeholder={t('calendar_custom_title_placeholder')}
                      />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('session_date')}</label>
                    <input type="date" value={newApt.date}
                      onChange={e => setNewApt({ ...newApt, date: e.target.value })}
                      className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('session_time')}</label>
                    <input type="time" value={newApt.time}
                      onChange={e => setNewApt({ ...newApt, time: e.target.value })}
                      className="input-field" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('session_duration')}</label>
                  <select value={newApt.duration}
                    onChange={e => setNewApt({ ...newApt, duration: parseInt(e.target.value) })}
                    className="input-field">
                    <option value={30}>30 {t('minutes')}</option>
                    <option value={45}>45 {t('minutes')}</option>
                    <option value={50}>50 {t('minutes')}</option>
                    <option value={60}>60 {t('minutes')}</option>
                    <option value={90}>90 {t('minutes')}</option>
                    <option value={120}>120 {t('minutes')}</option>
                  </select>
                </div>

                {newApt.entryType === 'session' && (
                  <>
                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-600">
                      <input type="checkbox" checked={newApt.isOnline}
                        onChange={e => setNewApt({ ...newApt, isOnline: e.target.checked })}
                        className="w-5 h-5 rounded text-indigo-600" />
                      <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('is_online')}</span>
                        <p className="text-xs text-gray-500">{t('appointment_online')}</p>
                      </div>
                    </label>

                    {newApt.isOnline && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('meeting_link_label')}</label>
                        <input type="url" value={newApt.meetingLink}
                          onChange={e => setNewApt({ ...newApt, meetingLink: e.target.value })}
                          className="input-field text-sm" placeholder="https://zoom.us/j/..." />
                      </div>
                    )}
                  </>
                )}

                <div className="flex gap-3 pt-2">
                  {editingAppointmentId && newApt.entryType === 'custom' && (
                    <button
                      onClick={() => editingAppointmentId && handleDeleteCustomAppointment(editingAppointmentId)}
                      className="btn-danger text-sm"
                    >
                      {t('delete')}
                    </button>
                  )}
                  <button onClick={() => setShowAddModal(false)} className="btn-secondary flex-1 text-sm">{t('cancel')}</button>
                  <button onClick={handleSaveAppointment}
                    disabled={!canSubmit || hasConflict}
                    className="btn-primary flex-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    {editingAppointmentId ? t('save') : (newApt.entryType === 'custom' ? t('calendar_add_custom') : t('add'))}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
