import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Camera } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Package } from '../types';
import { v4 as uuidv4 } from 'uuid';
import Layout from '../components/Layout';

export default function Profile() {
  const { user, updateUser } = useApp();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    therapyType: '',
    hourlyRate: 3000,
    currency: '₽',
    avatar: '',
    workingHours: { start: '09:00', end: '18:00' },
    workingDays: [1, 2, 3, 4, 5] as number[],
  });

  const [packages, setPackages] = useState<Package[]>([]);
  const [saved, setSaved] = useState(false);

  // Initialize form data when user loads
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
        therapyType: user.therapyType || '',
        hourlyRate: user.hourlyRate || 3000,
        currency: user.currency || '₽',
        avatar: user.avatar || '',
        workingHours: user.workingHours || { start: '09:00', end: '18:00' },
        workingDays: user.workingDays || [1, 2, 3, 4, 5],
      });
      setPackages(user.packages || []);
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateUser({
      ...formData,
      packages,
    });
    
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const addPackage = () => {
    setPackages([...packages, {
      id: uuidv4(),
      name: '',
      sessions: 4,
      price: 0,
      discount: 10,
    }]);
  };

  const removePackage = (id: string) => {
    setPackages(packages.filter(p => p.id !== id));
  };

  const updatePackage = (id: string, data: Partial<Package>) => {
    setPackages(packages.map(p => p.id === id ? { ...p, ...data } : p));
  };

  const toggleWorkingDay = (day: number) => {
    if (formData.workingDays.includes(day)) {
      setFormData({ ...formData, workingDays: formData.workingDays.filter(d => d !== day) });
    } else {
      setFormData({ ...formData, workingDays: [...formData.workingDays, day].sort() });
    }
  };

  const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const therapyTypes = [
    'Когнитивно-поведенческая терапия (КПТ)',
    'Психоанализ',
    'Гештальт-терапия',
    'Арт-терапия',
    'Семейная терапия',
    'Телесно-ориентированная терапия',
    'EMDR',
    'Гипнотерапия',
    'Экзистенциальная терапия',
    'Интегративный подход',
  ];

  if (!user) {
    return (
      <Layout>
        <div className="text-center py-16">
          <h2 className="text-xl font-bold text-gray-900">Загрузка...</h2>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto animate-fadeIn">
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Профиль</h1>
          <p className="text-gray-500">Настройки вашего аккаунта</p>
        </div>

        {saved && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 animate-fadeIn">
            ✓ Изменения сохранены
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar & Basic Info */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Личная информация</h2>
            
            <div className="flex flex-col sm:flex-row gap-6 mb-6">
              <div className="relative">
                {formData.avatar ? (
                  <img src={formData.avatar} alt="" className="w-24 h-24 rounded-2xl object-cover" />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-3xl font-bold">
                    {formData.name.charAt(0) || 'П'}
                  </div>
                )}
                <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-indigo-600 transition-colors">
                  <Camera className="w-4 h-4 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          setFormData({ ...formData, avatar: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Имя</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    placeholder="Анна Иванова"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="input-field"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Телефон</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="input-field"
                      placeholder="+7 (999) 123-45-67"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">О себе</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="input-field min-h-[100px] resize-y"
                placeholder="Расскажите о себе, своем опыте и подходе..."
              />
            </div>
          </div>

          {/* Therapy Type & Rate */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Профессиональная информация</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Тип терапии</label>
                <select
                  value={formData.therapyType}
                  onChange={(e) => setFormData({ ...formData, therapyType: e.target.value })}
                  className="input-field"
                >
                  <option value="">Выберите тип</option>
                  {therapyTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Стоимость сессии</label>
                  <input
                    type="number"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: parseInt(e.target.value) || 0 })}
                    className="input-field"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Валюта</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="input-field"
                  >
                    <option value="₽">₽ (Рубль)</option>
                    <option value="$">$ (Доллар)</option>
                    <option value="€">€ (Евро)</option>
                    <option value="₸">₸ (Тенге)</option>
                    <option value="₴">₴ (Гривна)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Working Hours */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Рабочее время</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Рабочие дни</label>
                <div className="flex flex-wrap gap-2">
                  {dayNames.map((name, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleWorkingDay(i)}
                      className={`
                        w-12 h-12 rounded-xl font-medium transition-all
                        ${formData.workingDays.includes(i) 
                          ? 'bg-indigo-500 text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                      `}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Начало работы</label>
                  <input
                    type="time"
                    value={formData.workingHours.start}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      workingHours: { ...formData.workingHours, start: e.target.value }
                    })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Конец работы</label>
                  <input
                    type="time"
                    value={formData.workingHours.end}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      workingHours: { ...formData.workingHours, end: e.target.value }
                    })}
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Packages */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Пакеты услуг</h2>
              <button type="button" onClick={addPackage} className="btn-secondary py-2 px-3 text-sm flex items-center gap-1">
                <Plus className="w-4 h-4" />
                Добавить
              </button>
            </div>

            {packages.length > 0 ? (
              <div className="space-y-4">
                {packages.map(pkg => (
                  <div key={pkg.id} className="p-4 bg-gray-50 rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={pkg.name}
                        onChange={(e) => updatePackage(pkg.id, { name: e.target.value })}
                        className="input-field flex-1 mr-4"
                        placeholder="Название пакета"
                      />
                      <button
                        type="button"
                        onClick={() => removePackage(pkg.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Сессий</label>
                        <input
                          type="number"
                          value={pkg.sessions}
                          onChange={(e) => updatePackage(pkg.id, { sessions: parseInt(e.target.value) || 0 })}
                          className="input-field"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Цена</label>
                        <input
                          type="number"
                          value={pkg.price}
                          onChange={(e) => updatePackage(pkg.id, { price: parseInt(e.target.value) || 0 })}
                          className="input-field"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Скидка %</label>
                        <input
                          type="number"
                          value={pkg.discount}
                          onChange={(e) => updatePackage(pkg.id, { discount: parseInt(e.target.value) || 0 })}
                          className="input-field"
                          min="0"
                          max="100"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Пакеты не добавлены</p>
            )}
          </div>

          {/* Submit */}
          <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
            <Save className="w-5 h-5" />
            Сохранить изменения
          </button>
        </form>
      </div>
    </Layout>
  );
}
