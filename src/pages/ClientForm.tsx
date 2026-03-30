import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { Client, Schedule, SocialLink, AcquisitionChannel, ScheduleFrequency } from '../types';
import { v4 as uuidv4 } from 'uuid';
import Layout from '../components/Layout';

const CURRENCIES = ['₽', '$', '€', '₸', '₴'];

export default function ClientForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addClient, updateClient, getClientById, user } = useApp();
  const { t } = useLanguage();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
    packageId: '',
    remainingSessions: 0,
    meetingLink: '',
    isOnline: false,
    status: 'active' as Client['status'],
    avatar: '',
    individualRate: '' as string | number,
    individualCurrency: '',
    acquisitionChannel: '' as AcquisitionChannel,
  });

  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  useEffect(() => {
    if (isEditing) {
      const client = getClientById(id);
      if (client) {
        setFormData({
          name: client.name,
          phone: client.phone || '',
          email: client.email || '',
          notes: client.notes,
          packageId: client.packageId || '',
          remainingSessions: client.remainingSessions,
          meetingLink: client.meetingLink || '',
          isOnline: client.isOnline,
          status: client.status,
          avatar: client.avatar || '',
          individualRate: client.individualRate !== undefined ? client.individualRate : '',
          individualCurrency: client.individualCurrency || '',
          acquisitionChannel: client.acquisitionChannel || '',
        });
        setSocialLinks(client.socialLinks);
        setSchedules(client.schedules);
      }
    }
  }, [id, isEditing, getClientById]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const rateVal = formData.individualRate === '' ? undefined : Number(formData.individualRate);

    const clientData = {
      ...formData,
      individualRate: rateVal,
      individualCurrency: formData.individualCurrency || undefined,
      acquisitionChannel: formData.acquisitionChannel || undefined,
      socialLinks,
      schedules,
    };

    if (isEditing && id) {
      await updateClient(id, clientData);
    } else {
      await addClient(clientData);
    }

    navigate('/clients');
  };

  const addSocialLink = () => {
    setSocialLinks([...socialLinks, { type: 'telegram', url: '' }]);
  };

  const removeSocialLink = (index: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
  };

  const updateSocialLink = (index: number, data: Partial<SocialLink>) => {
    setSocialLinks(socialLinks.map((link, i) => i === index ? { ...link, ...data } : link));
  };

  const addSchedule = () => {
    setSchedules([...schedules, {
      id: uuidv4(),
      dayOfWeek: 1,
      time: '10:00',
      duration: 50,
      frequency: 'weekly',
    }]);
  };

  const removeSchedule = (scheduleId: string) => {
    setSchedules(schedules.filter(s => s.id !== scheduleId));
  };

  const updateSchedule = (scheduleId: string, data: Partial<Schedule>) => {
    setSchedules(schedules.map(s => s.id === scheduleId ? { ...s, ...data } : s));
  };

  const handlePackageChange = (packageId: string) => {
    const pkg = user?.packages.find(p => p.id === packageId);
    setFormData({
      ...formData,
      packageId,
      remainingSessions: pkg ? pkg.sessions : 0,
    });
  };

  const dayNames = [
    t('day_sunday'), t('day_monday'), t('day_tuesday'), t('day_wednesday'),
    t('day_thursday'), t('day_friday'), t('day_saturday'),
  ];

  const frequencyLabels: Record<ScheduleFrequency, string> = {
    weekly: t('frequency_weekly'),
    biweekly: t('frequency_biweekly'),
    once: t('frequency_once'),
  };

  const acquisitionChannelLabels: Record<string, string> = {
    '': t('not_specified'),
    aggregator: t('channel_aggregator'),
    word_of_mouth: t('channel_word_of_mouth'),
    colleague_referral: t('channel_colleague_referral'),
    social_media: t('channel_social_media'),
    other: t('channel_other'),
  };

  const durationLabels: Record<number, string> = {
    30: `30 ${t('minutes')}`,
    45: `45 ${t('minutes')}`,
    50: `50 ${t('minutes')}`,
    60: `60 ${t('minutes')}`,
    90: `90 ${t('minutes')}`,
    120: `120 ${t('minutes')}`,
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto animate-fadeIn">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEditing ? t('edit_client_title') : t('new_client_title')}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('contact_info')}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('client_name')} *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('phone')}</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input-field"
                    placeholder="+7 (999) 123-45-67"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('email_address')}</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field"
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('status')}</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Client['status'] })}
                    className="input-field"
                  >
                    <option value="active">{t('status_active')}</option>
                    <option value="paused">{t('status_paused')}</option>
                    <option value="completed">{t('status_completed_client')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('acquisition_channel')}</label>
                  <select
                    value={formData.acquisitionChannel}
                    onChange={(e) => setFormData({ ...formData, acquisitionChannel: e.target.value as AcquisitionChannel })}
                    className="input-field"
                  >
                    {Object.entries(acquisitionChannelLabels).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Individual Rate */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-1">{t('individual_rate')}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{t('individual_rate_hint')} ({user?.hourlyRate?.toLocaleString()} {user?.currency})</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('individual_rate')}</label>
                <input
                  type="number"
                  value={formData.individualRate}
                  onChange={(e) => setFormData({ ...formData, individualRate: e.target.value })}
                  className="input-field"
                  placeholder={`${t('not_specified')} (${user?.hourlyRate ?? 0})`}
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('currency')}</label>
                <select
                  value={formData.individualCurrency}
                  onChange={(e) => setFormData({ ...formData, individualCurrency: e.target.value })}
                  className="input-field"
                >
                  <option value="">{t('not_specified')} ({user?.currency ?? '₽'})</option>
                  {CURRENCIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">{t('social_links')}</h2>
              <button type="button" onClick={addSocialLink} className="btn-secondary py-2 px-3 text-sm flex items-center gap-1">
                <Plus className="w-4 h-4" />
                {t('add')}
              </button>
            </div>

            {socialLinks.length > 0 ? (
              <div className="space-y-3">
                {socialLinks.map((link, index) => (
                  <div key={index} className="flex gap-3">
                    <select
                      value={link.type}
                      onChange={(e) => updateSocialLink(index, { type: e.target.value as SocialLink['type'] })}
                      className="input-field w-auto"
                    >
                      <option value="telegram">Telegram</option>
                      <option value="instagram">Instagram</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="other">{t('channel_other')}</option>
                    </select>
                    <input
                      type="url"
                      value={link.url}
                      onChange={(e) => updateSocialLink(index, { url: e.target.value })}
                      className="input-field flex-1"
                      placeholder="https://..."
                    />
                    <button
                      type="button"
                      onClick={() => removeSocialLink(index)}
                      className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm">{t('none')}</p>
            )}
          </div>

          {/* Session Format */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('format_online')}</h2>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!formData.isOnline}
                    onChange={() => setFormData({ ...formData, isOnline: false })}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="dark:text-gray-200">{t('is_offline')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.isOnline}
                    onChange={() => setFormData({ ...formData, isOnline: true })}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="dark:text-gray-200">{t('is_online')}</span>
                </label>
              </div>

              {formData.isOnline && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('meeting_link')}</label>
                  <input
                    type="url"
                    value={formData.meetingLink}
                    onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                    className="input-field"
                    placeholder="https://zoom.us/j/..."
                  />
                </div>
              )}
            </div>
          </div>

          {/* Package */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('package')}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('package')}</label>
                <select
                  value={formData.packageId}
                  onChange={(e) => handlePackageChange(e.target.value)}
                  className="input-field"
                >
                  <option value="">{t('no_package')}</option>
                  {user?.packages.map(pkg => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg.sessions} {t('sessions')} — {pkg.price.toLocaleString()} {user.currency})
                    </option>
                  ))}
                </select>
              </div>

              {formData.packageId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('remaining_sessions')}</label>
                  <input
                    type="number"
                    value={formData.remainingSessions}
                    onChange={(e) => setFormData({ ...formData, remainingSessions: parseInt(e.target.value) || 0 })}
                    className="input-field"
                    min="0"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Schedule */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">{t('schedule')}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {t('schedule_frequency')}
                </p>
              </div>
              <button type="button" onClick={addSchedule} className="btn-secondary py-2 px-3 text-sm flex items-center gap-1">
                <Plus className="w-4 h-4" />
                {t('add')}
              </button>
            </div>

            {schedules.length > 0 ? (
              <div className="space-y-3">
                {schedules.map(schedule => (
                  <div key={schedule.id} className="flex flex-wrap gap-2 items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <select
                      value={schedule.dayOfWeek}
                      onChange={(e) => updateSchedule(schedule.id, { dayOfWeek: parseInt(e.target.value) })}
                      className="input-field w-auto text-sm"
                    >
                      {dayNames.map((name, i) => (
                        <option key={i} value={i}>{name}</option>
                      ))}
                    </select>
                    <input
                      type="time"
                      value={schedule.time}
                      onChange={(e) => updateSchedule(schedule.id, { time: e.target.value })}
                      className="input-field w-auto text-sm"
                    />
                    <select
                      value={schedule.duration}
                      onChange={(e) => updateSchedule(schedule.id, { duration: parseInt(e.target.value) })}
                      className="input-field w-auto text-sm"
                    >
                      {Object.entries(durationLabels).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                    <select
                      value={schedule.frequency ?? 'weekly'}
                      onChange={(e) => updateSchedule(schedule.id, { frequency: e.target.value as ScheduleFrequency })}
                      className="input-field w-auto text-sm"
                    >
                      {(Object.entries(frequencyLabels) as [ScheduleFrequency, string][]).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeSchedule(schedule.id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg ml-auto"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm">{t('no_schedule')}</p>
            )}
          </div>

          {/* Notes */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('notes')}</h2>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input-field min-h-[120px] resize-y"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">
              {t('cancel')}
            </button>
            <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Save className="w-5 h-5" />
              {isEditing ? t('save') : t('add_client')}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
